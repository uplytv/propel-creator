const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { creator_id, custom_domain } = await req.json();
    if (!creator_id || !custom_domain) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check DNS via Cloudflare DoH
    let verified = false;
    try {
      const dnsRes = await fetch(`https://dns.cloudflare.com/dns-query?name=${custom_domain}&type=CNAME`, {
        headers: { Accept: "application/dns-json" },
      });
      const dnsData = await dnsRes.json();
      if (dnsData.Answer) {
        verified = dnsData.Answer.some((a: any) => a.data?.includes("uply.tv") || a.data?.includes("vercel"));
      }
    } catch {
      // DNS check failed
    }

    if (verified) {
      await supabase.from("creator_domains").upsert({
        creator_id, custom_domain, domain_status: "active", ssl_status: "active", verified_at: new Date().toISOString(),
      }, { onConflict: "creator_id" });
    } else {
      await supabase.from("creator_domains").upsert({
        creator_id, custom_domain, domain_status: "pending",
      }, { onConflict: "creator_id" });
    }

    return new Response(JSON.stringify({
      verified,
      instructions: verified ? null : {
        type: "CNAME",
        host: "@",
        value: "cname.uply.tv",
        ttl: 3600,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
