import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { createSessionWithTax } from "../_shared/stripeTax.ts";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  product_id: string;
  quantity: number;
}

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("Not authenticated");

    const body = await req.json().catch(() => ({}));
    const items = (body?.items ?? []) as CartItem[];
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate quantities and load products
    const cleanItems = items
      .filter((i) => i.product_id && Number.isFinite(i.quantity) && i.quantity > 0 && i.quantity <= 99)
      .slice(0, 50);

    const productIds = [...new Set(cleanItems.map((i) => i.product_id))];
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, name, price, image_url, stripe_price_id, status, type, user_id")
      .in("id", productIds);
    if (pErr) throw pErr;
    if (!products || products.length === 0) throw new Error("No valid products");

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-08-27.basil" });

    // Only active products are purchasable; keep this list as the single source
    // of truth for both the Stripe line items and the fulfillment record.
    const purchasable = cleanItems
      .map((i) => ({ product: productMap.get(i.product_id) as any, quantity: i.quantity }))
      .filter((x) => x.product && x.product.status === "active");

    const line_items = purchasable.map(({ product: p, quantity }) => {
      if (p.stripe_price_id) {
        return { price: p.stripe_price_id, quantity };
      }
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: p.name,
            images: p.image_url ? [p.image_url] : undefined,
          },
          unit_amount: Math.round(Number(p.price) * 100),
        },
        quantity,
      };
    });

    if (line_items.length === 0) throw new Error("No purchasable products in cart");

    // Persist the order BEFORE creating the Stripe session. The item list can
    // exceed Stripe's 500-char metadata value limit, so the session only carries
    // cart_order_id; finalize-cart-order reads the items from this row.
    const orderItems = purchasable.map(({ product: p, quantity }) => ({
      product_id: p.id,
      creator_id: p.user_id,
      name: p.name,
      type: p.type ?? "product",
      quantity,
      unit_price: Number(p.price),
    }));
    const subtotal = orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: cartOrder, error: coErr } = await supabaseAdmin
      .from("cart_orders")
      .insert({ buyer_id: user.id, items: orderItems, subtotal, status: "pending" })
      .select("id")
      .single();
    if (coErr || !cartOrder) throw new Error(coErr?.message ?? "Could not create cart order");

    // Reuse existing customer if possible
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") ?? "https://uply.tv";
    let session;
    try {
      // Flag-gated Stripe Tax (ENABLE_STRIPE_TAX secret). Off by default —
      // identical session params. Fee math untouched: cart orders carry no
      // application fee here (fulfillment splits happen downstream on the
      // pre-tax subtotal); Stripe adds tax on top for the buyer.
      session = await createSessionWithTax(stripe, {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        mode: "payment",
        line_items: line_items as any,
        allow_promotion_codes: true,
        success_url: `${origin}/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/shop?checkout=cancel`,
        metadata: {
          purchase_type: "cart",
          buyer_id: user.id,
          user_id: user.id,
          cart_order_id: cartOrder.id,
          source: "cart",
          item_count: String(line_items.length),
        },
      }, undefined, "create-cart-checkout");
    } catch (sessionErr) {
      // Session never existed — remove the dangling order so it can't be claimed.
      await supabaseAdmin.from("cart_orders").delete().eq("id", cartOrder.id);
      throw sessionErr;
    }

    await supabaseAdmin
      .from("cart_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", cartOrder.id);

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("create-cart-checkout error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
