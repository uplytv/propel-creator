const corsHeaders = { "Access-Control-Allow-Origin": "https://uply.tv", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal, withCors } from "../_shared/security.ts";

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id, title, body, url: notifUrl } = await req.json();
    if (!user_id || !title) return new Response(JSON.stringify({ error: "user_id and title required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get push subscriptions - handle both single user_id and array
    const userIds = Array.isArray(user_id) ? user_id : [user_id];
    const { data: subs } = await supabase.from("push_subscriptions").select("*").in("user_id", userIds);

    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = JSON.stringify({ title, body: body || "", icon: "/favicon.png", url: notifUrl || "/" });
    let sent = 0;
    const expired: string[] = [];

    for (const sub of subs) {
      try {
        // Use Web Push API directly
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", TTL: "86400" },
          body: payload,
        });
        if (res.status === 410 || res.status === 404) {
          expired.push(sub.id);
        } else if (res.ok) {
          sent++;
        }
      } catch {
        // Skip failed pushes
      }
    }

    // Remove expired subscriptions
    if (expired.length) {
      await supabase.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
