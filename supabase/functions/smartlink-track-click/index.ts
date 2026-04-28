// Public click tracker for SmartLinks. Captures country from CF header
// and dedupes click events per IP+link+platform within a 30-minute window.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const link_id = typeof body.link_id === "string" ? body.link_id : null;
    const platform = typeof body.platform === "string" ? body.platform : "view";
    const referrer = typeof body.referrer === "string" ? body.referrer : null;

    if (!link_id) {
      return new Response(JSON.stringify({ error: "link_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const country = req.headers.get("cf-ipcountry") || null;
    const userAgent = req.headers.get("user-agent") || null;
    const ipRaw =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let ipHash: string | null = null;
    if (ipRaw) {
      const buf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(ipRaw + link_id + platform)
      );
      ipHash = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 32);

      // Dedup non-view events per IP+link+platform within 30 minutes
      if (platform !== "view") {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("smart_link_clicks")
          .select("*", { head: true, count: "exact" })
          .eq("link_id", link_id)
          .eq("ip_hash", ipHash)
          .eq("platform", platform)
          .gte("clicked_at", thirtyMinsAgo);

        if ((count ?? 0) > 0) {
          return new Response(
            JSON.stringify({ ok: true, deduplicated: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    await supabase.from("smart_link_clicks").insert({
      link_id,
      platform,
      country,
      referrer,
      user_agent: userAgent,
      ip_hash: ipHash,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
