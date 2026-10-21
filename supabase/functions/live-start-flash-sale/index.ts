import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ud } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!ud.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { live_product_id, discount_percent, duration_seconds } = await req.json();

    if (!live_product_id || !discount_percent || !duration_seconds) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: product } = await supabase
      .from("live_products")
      .select("*")
      .eq("id", live_product_id)
      .single();

    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const original_price = (product as any).price;
    const sale_price = Math.round(original_price * (1 - discount_percent / 100) * 100) / 100;
    const ends_at = new Date(Date.now() + duration_seconds * 1000).toISOString();

    // Deactivate any existing flash sale for this product
    await supabase
      .from("live_flash_sales")
      .update({ is_active: false })
      .eq("live_product_id", live_product_id)
      .eq("is_active", true);

    const { data: flashSale, error: fsErr } = await supabase
      .from("live_flash_sales")
      .insert({
        live_product_id,
        stream_id: (product as any).stream_id,
        creator_id: (product as any).creator_id,
        discount_percent,
        original_price,
        sale_price,
        duration_seconds,
        ends_at,
        is_active: true,
      })
      .select()
      .single();

    if (fsErr) throw fsErr;

    // Temporarily update product price to sale price
    await supabase
      .from("live_products")
      .update({ price: sale_price })
      .eq("id", live_product_id);

    // Post announcement in live chat
    const label = duration_seconds < 60 ? `${duration_seconds}s` : `${Math.round(duration_seconds / 60)}m`;
    await supabase
      .from("live_chat_messages")
      .insert({
        stream_id: (product as any).stream_id,
        user_id: (product as any).creator_id,
        username: "UPLY Shop",
        message: `⚡ FLASH SALE: "${(product as any).title}" — ${discount_percent}% OFF! Now $${sale_price} for ${label}!`,
        is_pinned: false,
      })
      .catch(() => {});

    return new Response(JSON.stringify({ flash_sale: flashSale }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
