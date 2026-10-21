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
    const { event_id, title } = await req.json();
    if (!event_id) return err("event_id required");

    const { data: event } = await supabase.from("events").select("*").eq("id", event_id).single();
    if (!event) return err("Event not found", 404);
    const allowed =
      event.creator_id === userId ||
      (event.co_host_ids ?? []).includes(userId) ||
      // ticket holders can go live at the event too
      (
        await supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event_id)
          .eq("owner_id", userId)
          .eq("status", "active")
      ).count! > 0;
    if (!allowed) return err("No access to go live at this event", 403);

    // Create the live stream via existing helper
    const { data: liveStream, error: lsErr } = await supabase.functions.invoke(
      "mux-create-livestream",
      {
        body: {
          title: title ?? `Live at ${event.title}`,
          event_id,
          user_id: userId,
        },
      },
    );
    if (lsErr) throw lsErr;

    // Pre-load ticket tiers as live commerce items (only for event creator)
    if (event.creator_id === userId && liveStream?.stream_id) {
      const { data: tiers } = await supabase
        .from("ticket_tiers")
        .select("id, name, price_cents, perks")
        .eq("event_id", event_id)
        .eq("is_hidden", false);
      if (tiers?.length) {
        await supabase.from("live_commerce_items").insert(
          tiers.map((t: any, i: number) => ({
            live_stream_id: liveStream.stream_id,
            creator_id: userId,
            item_type: "ticket_tier",
            ref_id: t.id,
            title: t.name,
            price_cents: t.price_cents,
            sort_order: i,
            pin_to_stream: i === 0,
          })),
        );
      }

      // Link the live stream back to event
      await supabase
        .from("events")
        .update({ live_stream_id: liveStream.stream_id })
        .eq("id", event_id);
    }

    return json({ stream_id: liveStream?.stream_id, ...liveStream });
  } catch (e) {
    await logError(supabase, "go-live-at-event", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
