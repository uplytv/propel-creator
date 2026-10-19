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
    const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

    // Find events starting within 30 minutes that haven't had link revealed
    const { data: events, error } = await supabase
      .from("events")
      .select("id, title, virtual_link, creator_id")
      .lte("starts_at", thirtyMinLater.toISOString())
      .gt("starts_at", now.toISOString())
      .is("virtual_link_unlocked_at", null)
      .eq("stream_on_uply", false)
      .neq("virtual_link", null)
      .in("event_type", ["virtual", "hybrid"])
      .eq("status", "published");

    if (error) throw error;
    if (!events?.length) {
      return new Response(JSON.stringify({ revealed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let revealed = 0;
    for (const event of events) {
      // Update virtual_link_unlocked_at
      await supabase
        .from("events")
        .update({ virtual_link_unlocked_at: now.toISOString() })
        .eq("id", event.id);

      // Get all ticket holders
      const { data: tickets } = await supabase
        .from("tickets")
        .select("buyer_id")
        .eq("event_id", event.id)
        .eq("status", "active");

      if (tickets?.length) {
        // Send notifications to all ticket holders
        const notifications = tickets.map((t: any) => ({
          user_id: t.buyer_id,
          type: "virtual_link_revealed",
          title: `${event.title} starts in 30 minutes`,
          message: `Here is your access link: ${event.virtual_link}`,
          reference_id: event.id,
        }));

        await supabase.from("notifications").insert(notifications);

        // Enqueue emails for each ticket holder
        for (const ticket of tickets) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", ticket.buyer_id)
            .single();

          if (profile?.email) {
            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                to: profile.email,
                subject: `${event.title} starts in 30 minutes — here is your link`,
                html: `<p>Your event <strong>${event.title}</strong> starts in 30 minutes.</p><p>Access link: <a href="${event.virtual_link}">${event.virtual_link}</a></p>`,
              },
            });
          }
        }
      }
      revealed++;
    }

    return new Response(JSON.stringify({ revealed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
