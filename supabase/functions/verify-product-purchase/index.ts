import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) =>
  console.log(`[VERIFY-PRODUCT-PURCHASE] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const { session_id, product_id } = body as { session_id?: string; product_id?: string };
    if (!session_id || !product_id) throw new Error("session_id and product_id required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      log("Session not paid yet", { session_id, status: session.payment_status });
      return new Response(JSON.stringify({ paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify the buyer matches the session
    const sessionBuyerId = (session.metadata as any)?.buyer_id;
    if (sessionBuyerId && sessionBuyerId !== user.id) {
      throw new Error("Session buyer mismatch");
    }

    // Look up the product
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();
    if (prodErr || !product) throw new Error("Product not found");

    // Idempotently record the purchase
    const amount = ((session.amount_total ?? Math.round(Number(product.price) * 100)) / 100);
    const { error: insertErr } = await supabase
      .from("product_purchases")
      .insert({
        product_id: product.id,
        buyer_id: user.id,
        creator_id: product.user_id,
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        amount,
        status: "completed",
      });
    if (insertErr && !/duplicate|unique/i.test(insertErr.message)) {
      log("Insert purchase warning", { msg: insertErr.message });
    }

    // For digital downloads, generate a 1h signed URL and email it.
    const isDigital = product.type === "digital" && !!product.download_url;
    let signedUrl: string | null = null;

    if (isDigital) {
      const { data: signed, error: sErr } = await supabase
        .storage
        .from("digital-products")
        .createSignedUrl(product.download_url, 60 * 60); // 1 hour
      if (sErr) {
        log("Signed URL error", { msg: sErr.message });
      } else {
        signedUrl = signed?.signedUrl ?? null;
      }

      if (signedUrl && user.email) {
        try {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "digital-product-receipt",
              recipientEmail: user.email,
              idempotencyKey: `digital-receipt-${session.id}`,
              templateData: {
                productName: product.name,
                fileName: product.download_file_name || product.download_url.split("/").pop(),
                downloadUrl: signedUrl,
                amount: `$${amount.toFixed(2)}`,
                expiresInHours: 1,
              },
            },
          });
          log("Receipt email enqueued", { to: user.email });
        } catch (e) {
          log("Email send failed", { msg: (e as Error).message });
        }
      }
    }

    return new Response(
      JSON.stringify({ paid: true, is_digital: isDigital, download_url: signedUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    log("ERROR", { message: (e as Error).message });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
