import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ud } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!ud.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, shop_domain, access_token, stream_id, product_ids } = body;

    if (action === "connect") {
      const clean = (shop_domain as string).replace("https://", "").replace(/\/$/, "");
      const r = await fetch(`https://${clean}/admin/api/2024-01/shop.json`, {
        headers: { "X-Shopify-Access-Token": access_token },
      });
      if (!r.ok) {
        return new Response(JSON.stringify({ error: "Invalid Shopify credentials" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { shop } = await r.json();

      await supabase.from("creator_shopify_stores").upsert(
        {
          creator_id: ud.user.id,
          shop_domain: clean,
          access_token,
          shop_name: shop.name,
          currency: shop.currency,
          is_active: true,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "creator_id" }
      );

      return new Response(JSON.stringify({ success: true, shop_name: shop.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "fetch_products") {
      const { data: store } = await supabase
        .from("creator_shopify_stores")
        .select("*")
        .eq("creator_id", ud.user.id)
        .single();

      if (!store) {
        return new Response(JSON.stringify({ error: "No Shopify store connected" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const r = await fetch(
        `https://${store.shop_domain}/admin/api/2024-01/products.json?limit=50&status=active`,
        { headers: { "X-Shopify-Access-Token": store.access_token } }
      );
      const { products } = await r.json();

      const mapped = (products || []).map((p: any) => ({
        id: p.id.toString(),
        title: p.title,
        description: p.body_html?.replace(/<[^>]*>/g, "").slice(0, 300) || "",
        image: p.images?.[0]?.src || null,
        variants: p.variants.map((v: any) => ({
          id: v.id.toString(),
          title: v.title,
          price: parseFloat(v.price),
          inventory_quantity: v.inventory_quantity || 0,
          sku: v.sku || null,
        })),
      }));

      return new Response(JSON.stringify({ products: mapped }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import_to_stream") {
      const { data: store } = await supabase
        .from("creator_shopify_stores")
        .select("*")
        .eq("creator_id", ud.user.id)
        .single();

      if (!store) {
        return new Response(JSON.stringify({ error: "No Shopify store" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const imported: any[] = [];
      for (const item of product_ids || []) {
        try {
          const r = await fetch(
            `https://${store.shop_domain}/admin/api/2024-01/products/${item.product_id}.json`,
            { headers: { "X-Shopify-Access-Token": store.access_token } }
          );
          const { product } = await r.json();
          const v = product.variants.find((x: any) => x.id.toString() === item.variant_id) || product.variants[0];

          const { data: np } = await supabase
            .from("live_products")
            .insert({
              stream_id,
              creator_id: ud.user.id,
              title: product.title + (v.title !== "Default Title" ? ` — ${v.title}` : ""),
              description: product.body_html?.replace(/<[^>]*>/g, "").slice(0, 500) || null,
              image_url: product.images?.[0]?.src || null,
              additional_images: product.images?.slice(1, 4).map((i: any) => i.src) || [],
              price: parseFloat(v.price),
              quantity_total: Math.max(v.inventory_quantity || 1, 1),
              quantity_remaining: Math.max(v.inventory_quantity || 1, 1),
              type: "sell",
              sku: v.sku || null,
              shopify_product_id: product.id.toString(),
              shopify_variant_id: v.id.toString(),
              shopify_checkout_url: `https://${store.shop_domain}/cart/${v.id}:1`,
              position: 0,
            })
            .select()
            .single();

          if (np) imported.push(np);
        } catch {
          // skip individual failures
        }
      }

      return new Response(JSON.stringify({ imported: imported.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
