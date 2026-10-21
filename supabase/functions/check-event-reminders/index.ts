import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000);
    const sixtyMinLater = new Date(now.getTime() + 60 * 60 * 1000);
    let sent = 0;

    // --- Stream reminders (15 min window) ---
    const { data: streamReminders } = await supabase
      .from("stream_reminders")
      .select("id, user_id, scheduled_stream_id")
      .is("sent_at", null);

    if (streamReminders?.length) {
      const streamIds = [...new Set(streamReminders.map((r: any) => r.scheduled_stream_id))];
      const { data: streams } = await supabase
        .from("scheduled_streams")
        .select("id, title, scheduled_at")
        .in("id", streamIds)
        .lte("scheduled_at", fifteenMinLater.toISOString())
        .gt("scheduled_at", now.toISOString())
        .eq("status", "scheduled");

      if (streams?.length) {
        const streamMap = new Map(streams.map((s: any) => [s.id, s]));
        for (const reminder of streamReminders) {
          const stream = streamMap.get(reminder.scheduled_stream_id);
          if (!stream) continue;

          await supabase.from("notifications").insert({
            user_id: reminder.user_id,
            type: "stream_reminder",
            title: `${stream.title} starts in 15 minutes`,
            message: "Don't miss it! The stream is about to begin.",
            reference_id: stream.id,
          });

          await supabase
            .from("stream_reminders")
            .update({ sent_at: now.toISOString() })
            .eq("id", reminder.id);

          sent++;
        }
      }
    }

    // --- Event reminders (15-60 min window) ---
    const { data: eventReminders } = await supabase
      .from("event_reminders")
      .select("id, user_id, event_id")
      .is("reminded_at", null);

    if (eventReminders?.length) {
      const eventIds = [...new Set(eventReminders.map((r: any) => r.event_id))];
      const { data: events } = await supabase
        .from("events")
        .select("id, title, starts_at")
        .in("id", eventIds)
        .lte("starts_at", sixtyMinLater.toISOString())
        .gt("starts_at", now.toISOString())
        .eq("status", "published");

      if (events?.length) {
        const eventMap = new Map(events.map((e: any) => [e.id, e]));
        for (const reminder of eventReminders) {
          const event = eventMap.get(reminder.event_id);
          if (!event) continue;

          const minsUntil = Math.round((new Date(event.starts_at).getTime() - now.getTime()) / 60000);

          await supabase.from("notifications").insert({
            user_id: reminder.user_id,
            type: "event_reminder",
            title: `${event.title} starts in ${minsUntil} minutes`,
            message: "Get ready! Your event is coming up soon.",
            reference_id: event.id,
          });

          await supabase
            .from("event_reminders")
            .update({ reminded_at: now.toISOString() })
            .eq("id", reminder.id);

          sent++;
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
