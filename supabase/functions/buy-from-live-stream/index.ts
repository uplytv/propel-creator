import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError, PLATFORM_FEE_PCT } from "../_shared/eventsCors.ts";
import { withCors } from "../_shared/security.ts";

serve(withCors(async (req) => {
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
    const { item_id, success_url, cancel_url } = await req.json();
    if (!item_id) return err("item_id required");
    const idempotencyKey = req.headers.get("x-idempotency-key") ?? crypto.randomUUID();

    const { data: item } = await supabase
      .from("live_commerce_items")
      .select("*")
      .eq("id", item_id)
      .single();
    if (!item) return err("Item not found", 404);
    if (item.inventory != null && item.inventory <= 0) return err("Sold out", 409);

    // Route ticket_tier purchases through the regular ticket flow
    if (item.item_type === "ticket_tier" && item.ref_id) {
      const { data, error: invokeErr } = await supabase.functions.invoke("purchase-ticket", {
        body: { tier_id: item.ref_id, quantity: 1, success_url, cancel_url },
        headers: { "x-idempotency-key": idempotencyKey, Authorization: auth },
      });
      if (invokeErr) throw invokeErr;
      return json(data);
    }

    const subtotal = item.price_cents;
    const fees = Math.round(subtotal * PLATFORM_FEE_PCT);
    const total = subtotal + fees;

    const { data: order } = await supabase
      .from("orders")
      .insert({
        buyer_id: userId,
        order_type: "live_stream_purchase",
        subtotal_cents: subtotal,
        fees_cents: fees,
        total_cents: total,
        status: "pending",
        idempotency_key: idempotencyKey,
        line_items: [{ item_id, item_type: item.item_type, title: item.title }],
        metadata: {
          live_stream_id: item.live_stream_id,
          creator_id: item.creator_id,
        },
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
                name: item.title,
                images: item.image_url ? [item.image_url] : undefined,
              },
              unit_amount: total,
            },
            quantity: 1,
          },
        ],
        success_url:
          success_url ?? `${req.headers.get("origin") ?? "https://uply.tv"}/live/${item.live_stream_id}`,
        cancel_url:
          cancel_url ?? `${req.headers.get("origin") ?? "https://uply.tv"}/live/${item.live_stream_id}`,
        client_reference_id: order.id,
        metadata: {
          order_id: order.id,
          item_id,
          buyer_id: userId,
          creator_id: item.creator_id,
          live_stream_id: item.live_stream_id ?? "",
          order_type: "live_stream_purchase",
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
    await logError(supabase, "buy-from-live-stream", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
