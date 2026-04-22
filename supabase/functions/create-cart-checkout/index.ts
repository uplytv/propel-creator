import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  product_id: string;
  quantity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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
      .select("id, name, price, image_url, stripe_price_id, status")
      .in("id", productIds);
    if (pErr) throw pErr;
    if (!products || products.length === 0) throw new Error("No valid products");

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2025-08-27.basil" });

    const line_items = cleanItems
      .map((i) => {
        const p: any = productMap.get(i.product_id);
        if (!p || p.status !== "active") return null;
        if (p.stripe_price_id) {
          return { price: p.stripe_price_id, quantity: i.quantity };
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
          quantity: i.quantity,
        };
      })
      .filter(Boolean);

    if (line_items.length === 0) throw new Error("No purchasable products in cart");

    // Reuse existing customer if possible
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") ?? "https://uply.tv";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "payment",
      line_items: line_items as any,
      success_url: `${origin}/shop?checkout=success`,
      cancel_url: `${origin}/shop?checkout=cancel`,
      metadata: {
        user_id: user.id,
        source: "cart",
        item_count: String(line_items.length),
      },
    });

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
});
