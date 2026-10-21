import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError } from "../_shared/eventsCors.ts";
import { withCors } from "../_shared/security.ts";

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  let userId: string | null = null;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return err("Unauthorized", 401);
    userId = u.user.id;
    const { event_id } = await req.json();
    if (!event_id) return err("event_id required");

    const { data: event } = await supabase.from("events").select("*").eq("id", event_id).single();
    if (!event) return err("Event not found", 404);
    if (event.creator_id !== userId && !(event.co_host_ids ?? []).includes(userId))
      return err("Forbidden", 403);

    await supabase
      .from("events")
      .update({
        status: "published",
        ticket_sales_open_at: event.ticket_sales_open_at ?? new Date().toISOString(),
      })
      .eq("id", event_id);

    // Fan-out push to followers (non-blocking best-effort)
    try {
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId)
        .limit(1000);
      if (followers?.length) {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_ids: followers.map((f: any) => f.follower_id),
            title: "🎟️ New Event",
            body: `${event.title} just dropped`,
            action_url: `/events/${event.slug ?? event.id}`,
          },
        });
      }
    } catch (e) {
      console.warn("publish-event push fan-out failed", e);
    }

    return json({ ok: true });
  } catch (e) {
    await logError(supabase, "publish-event", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
