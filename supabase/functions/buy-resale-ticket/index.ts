import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCreatorPlatformFeeRate } from "../_shared/platformFees.ts";
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
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return err("Unauthorized", 401);
    userId = u.user.id;
    const { listing_id, success_url, cancel_url } = await req.json();
    if (!listing_id) return err("listing_id required");
    const idempotencyKey = req.headers.get("x-idempotency-key") ?? crypto.randomUUID();

    const { data: listing } = await supabase
      .from("ticket_listings")
      .select("*, events!inner(*), tickets!inner(*)")
      .eq("id", listing_id)
      .single();
    if (!listing) return err("Listing not found", 404);
    if (listing.status !== "active") return err("Listing no longer active");
    if (listing.seller_id === userId) return err("Cannot buy your own listing");

    const event = (listing as any).events;
    const ticket = (listing as any).tickets;
    if (!event.resale_allowed) return err("Resale disabled for this event");

    // Defense-in-depth: enforce price cap at purchase time too
    const { data: tier } = await supabase
      .from("ticket_tiers")
      .select("price_cents")
      .eq("id", ticket.tier_id)
      .maybeSingle();
    const facePriceCents =
      tier?.price_cents ?? ticket.purchase_price_cents ?? Math.round((event.ticket_price ?? 0) * 100);
    const capPct = event.resale_price_cap_pct ?? 120;
    const cap = Math.round((facePriceCents * capPct) / 100);
    if (facePriceCents > 0 && listing.asking_price_cents > cap) {
      return err(`Listing price exceeds resale cap of $${(cap / 100).toFixed(2)}`, 400);
    }

    const subtotal = listing.asking_price_cents;
    const fees = Math.round(subtotal * await getCreatorPlatformFeeRate(supabase, event.creator_id));
    const total = subtotal + fees;

    const { data: order } = await supabase
      .from("orders")
      .insert({
        buyer_id: userId,
        event_id: event.id,
        order_type: "resale_ticket",
        subtotal_cents: subtotal,
        fees_cents: fees,
        total_cents: total,
        status: "pending",
        idempotency_key: idempotencyKey,
        line_items: [{ listing_id, ticket_id: listing.ticket_id }],
        metadata: { seller_id: listing.seller_id },
      })
      .select()
      .single();
    if (!order) throw new Error("Order failed");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${event.title} — Resale`,
                images: event.cover_image_url ? [event.cover_image_url] : undefined,
              },
              unit_amount: total,
            },
            quantity: 1,
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
          listing_id,
          ticket_id: listing.ticket_id,
          buyer_id: userId,
          seller_id: listing.seller_id,
          event_id: event.id,
          order_type: "resale_ticket",
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
    await logError(supabase, "buy-resale-ticket", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
});
