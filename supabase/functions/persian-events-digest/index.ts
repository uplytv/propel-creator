// Weekly Persian events digest — pushes to opted-in users
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Pull the next 7 days of Persian events
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: events, error: evErr } = await supabase
    .from("events_global")
    .select("id, title, date, city, country, image_url")
    .eq("is_persian", true)
    .gte("date", now.toISOString())
    .lte("date", weekFromNow.toISOString())
    .order("date", { ascending: true })
    .limit(10);

  if (evErr) {
    console.error("[persian-digest] event fetch error:", evErr);
    return new Response(JSON.stringify({ error: evErr.message }), { status: 500, headers: corsHeaders });
  }

  if (!events || events.length === 0) {
    console.log("[persian-digest] no upcoming Persian events this week");
    return new Response(JSON.stringify({ success: true, sent: 0, reason: "no_events" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Find users who haven't opted out of marketing emails — best-effort with the interests/origin signal
  const { data: users } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .or("interests.cs.{persian},interests.cs.{iranian},interests.cs.{farsi}")
    .limit(2000);

  let notified = 0;
  for (const u of users || []) {
    try {
      await supabase.from("notifications").insert({
        user_id: u.user_id,
        type: "persian_events_digest",
        title: `🇮🇷 ${events.length} Persian event${events.length > 1 ? "s" : ""} this week`,
        message: events.slice(0, 3).map((e: any) => e.title).join(" · "),
        link: "/events?tab=worldwide&persian=1",
        read: false,
      });
      notified++;
    } catch (err) {
      console.warn("[persian-digest] notify failed for", u.user_id, err);
    }
  }

  console.log("[persian-events-digest]", { events: events.length, notified });
  return new Response(JSON.stringify({ success: true, events: events.length, notified }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}));
