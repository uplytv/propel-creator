import { isAuthorizedCron } from "../_shared/cronAuth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    if (!await isAuthorizedCron(req, supabase)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let processed = 0;

    // Find expired notified waitlist entries (notified > 24h ago, no ticket purchased)
    const { data: expiredEntries } = await supabase
      .from("event_waitlist")
      .select("id, event_id, user_id, position")
      .eq("notified", true)
      .not("notified_at", "is", null)
      .lt("notified_at", twentyFourHoursAgo.toISOString());

    if (!expiredEntries?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const entry of expiredEntries) {
      // Check if user actually purchased a ticket
      const { data: ticket } = await supabase
        .from("tickets")
        .select("id")
        .eq("event_id", entry.event_id)
        .eq("buyer_id", entry.user_id)
        .eq("status", "active")
        .limit(1);

      if (ticket && ticket.length > 0) {
        // They bought a ticket, just clean up the waitlist entry
        await supabase.from("event_waitlist").delete().eq("id", entry.id);
        continue;
      }

      // Reset this entry - they didn't claim
      await supabase
        .from("event_waitlist")
        .update({ notified: false, notified_at: null })
        .eq("id", entry.id);

      // Find next person on waitlist for this event
      const { data: nextPerson } = await supabase
        .from("event_waitlist")
        .select("id, user_id, event_id")
        .eq("event_id", entry.event_id)
        .eq("notified", false)
        .order("position", { ascending: true })
        .limit(1);

      if (nextPerson?.length) {
        const next = nextPerson[0];

        // Get event title
        const { data: event } = await supabase
          .from("events")
          .select("title, slug, creator_id")
          .eq("id", next.event_id)
          .single();

        // Notify next person
        await supabase
          .from("event_waitlist")
          .update({ notified: true, notified_at: now.toISOString() })
          .eq("id", next.id);

        if (event) {
          await supabase.from("notifications").insert({
            user_id: next.user_id,
            type: "waitlist_spot_open",
            title: `A spot just opened for ${event.title}`,
            message: "You have 24 hours to claim your ticket!",
            reference_id: next.event_id,
          });

          // Get user email for notification
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", next.user_id)
            .single();

          if (profile?.email) {
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                to: profile.email,
                subject: `A spot just opened for ${event.title}`,
                html: `<p>A spot just opened for <strong>${event.title}</strong>.</p><p>You have 24 hours to claim your ticket before it goes to the next person.</p>`,
              },
            });
          }
        }
      }
      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
