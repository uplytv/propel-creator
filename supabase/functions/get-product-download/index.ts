// get-product-download — lets a buyer re-download a digital product they own.
// The purchase-time path (verify-product-purchase) emails a 1h signed URL once;
// this function is the persistent re-access path used by the Purchases page.
// Auth: caller's JWT is verified manually (config.toml sets verify_jwt = false).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const productId = (body as { product_id?: string }).product_id;
    if (!productId) return json({ error: "product_id required" }, 400);

    // Verify the caller actually bought this product
    const { data: purchase, error: purchaseErr } = await supabase
      .from("product_purchases")
      .select("id, status")
      .eq("product_id", productId)
      .eq("buyer_id", user.id)
      .limit(1)
      .maybeSingle();
    if (purchaseErr) return json({ error: "Could not verify purchase" }, 500);
    if (!purchase) return json({ error: "No purchase found for this product" }, 403);
    if (purchase.status === "refunded") return json({ error: "This purchase was refunded" }, 403);

    // Look up the file
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("download_url, download_file_name")
      .eq("id", productId)
      .maybeSingle();
    if (prodErr || !product) return json({ error: "Product not found" }, 404);
    if (!product.download_url) return json({ error: "This product has no downloadable file" }, 404);

    // 1h signed URL from the private bucket (same as verify-product-purchase)
    const { data: signed, error: signErr } = await supabase.storage
      .from("digital-products")
      .createSignedUrl(product.download_url, 60 * 60);
    if (signErr || !signed?.signedUrl) return json({ error: "Could not generate download link" }, 500);

    return json({
      url: signed.signedUrl,
      file_name: product.download_file_name || product.download_url.split("/").pop() || "download",
      expires_in: 3600,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
