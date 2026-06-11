import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError, PLATFORM_FEE_PCT } from "../_shared/eventsCors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  let userId: string | null = null;
  let body: any = null;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return err("Unauthorized", 401);
    userId = u.user.id;
    body = await req.json();
    const { tier_id, quantity = 1, referral_code, success_url, cancel_url } = body ?? {};
    if (!tier_id) return err("tier_id required");
    if (quantity < 1 || quantity > 8) return err("quantity must be 1-8");

    // Idempotency
    const idempotencyKey = req.headers.get("x-idempotency-key") ?? crypto.randomUUID();

    const { data: tier } = await supabase
      .from("ticket_tiers")
      .select("*, events!inner(*)")
      .eq("id", tier_id)
      .single();
    if (!tier) return err("Tier not found", 404);
    const event = (tier as any).events;
    if (event.status !== "published") return err("Event not on sale");

    // Per-user limit
    if (tier.per_user_limit) {
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("tier_id", tier_id)
        .eq("owner_id", userId);
      if ((count ?? 0) + quantity > tier.per_user_limit)
        return err(`Limit ${tier.per_user_limit} per buyer`);
    }

    // Atomic reserve
    const { data: reserved } = await supabase.rpc("reserve_ticket_inventory", {
      p_tier_id: tier_id,
      p_quantity: quantity,
    });
    if (!reserved) return err("Sold out", 409);

    // Per-event configurable platform fee (falls back to the 5% default).
    const feePct =
      typeof event.platform_fee_pct === "number" && event.platform_fee_pct >= 0
        ? event.platform_fee_pct
        : PLATFORM_FEE_PCT;
    const subtotal = tier.price_cents * quantity;
    const fees = Math.round(subtotal * feePct);
    const total = subtotal + fees;

    // Create order
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        buyer_id: userId,
        event_id: event.id,
        order_type: "primary_ticket",
        subtotal_cents: subtotal,
        fees_cents: fees,
        total_cents: total,
        currency: tier.currency,
        status: "pending",
        idempotency_key: idempotencyKey,
        line_items: [
          { tier_id, quantity, unit_price_cents: tier.price_cents, name: tier.name },
        ],
        metadata: { referral_code: referral_code ?? null },
      })
      .select()
      .single();
    if (oErr || !order) {
      await supabase.rpc("release_ticket_inventory", { p_tier_id: tier_id, p_quantity: quantity });
      throw oErr ?? new Error("Order failed");
    }

    // Stripe checkout
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        // Hold expires after 30 min (Stripe minimum); release-expired-ticket-holds
        // releases the reserved inventory for abandoned checkouts.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        line_items: [
          {
            price_data: {
              currency: tier.currency.toLowerCase(),
              product_data: {
                name: `${event.title} — ${tier.name}`,
                description: tier.description ?? undefined,
                images: event.cover_image_url ? [event.cover_image_url] : undefined,
              },
              unit_amount: tier.price_cents + Math.round(tier.price_cents * feePct),
            },
            quantity,
          },
        ],
        success_url: (() => {
          const base = success_url ?? `${req.headers.get("origin") ?? "https://uply.tv"}/tickets/success`;
          return `${base}${base.includes("?") ? "&" : "?"}order=${order.id}`;
        })(),
        cancel_url:
          cancel_url ?? `${req.headers.get("origin") ?? "https://uply.tv"}/events/${event.slug ?? event.id}`,
        client_reference_id: order.id,
        metadata: {
          order_id: order.id,
          tier_id,
          event_id: event.id,
          quantity: String(quantity),
          buyer_id: userId,
          referral_code: referral_code ?? "",
          order_type: "primary_ticket",
        },
      },
      { idempotencyKey },
    );

    await supabase
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);

    return json({ url: session.url, order_id: order.id });
  } catch (e) {
    await logError(supabase, "purchase-ticket", e, body, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
});
