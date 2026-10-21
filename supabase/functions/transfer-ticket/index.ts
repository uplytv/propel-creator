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
    const { ticket_id, to_user_id, to_username } = await req.json();
    if (!ticket_id) return err("ticket_id required");

    let recipientId = to_user_id;
    if (!recipientId && to_username) {
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", to_username.replace(/^@/, ""))
        .single();
      recipientId = p?.user_id;
    }
    if (!recipientId) return err("Recipient not found");
    if (recipientId === userId) return err("Cannot transfer to yourself");

    const { data: ticket } = await supabase.from("tickets").select("*").eq("id", ticket_id).single();
    if (!ticket) return err("Ticket not found", 404);
    if (ticket.owner_id !== userId) return err("Not your ticket", 403);
    if (ticket.status !== "active") return err(`Cannot transfer ${ticket.status} ticket`);

    const newSecret = (await supabase.rpc("rotate_ticket_qr", { p_ticket_id: ticket_id })).data;

    await supabase
      .from("tickets")
      .update({
        owner_id: recipientId,
        transferred_from: userId,
        transfer_count: (ticket.transfer_count ?? 0) + 1,
        status: "active",
      })
      .eq("id", ticket_id);

    // Notify recipient
    await supabase.from("notifications").insert({
      user_id: recipientId,
      type: "ticket_received",
      title: "🎟️ Ticket Transferred",
      message: `You received a ticket from a friend.`,
      reference_id: ticket_id,
      link: `/events/${ticket.event_id}/ticket`,
      actor_id: userId,
    });

    return json({ ok: true, new_secret_preview: (newSecret ?? "").slice(0, 6) });
  } catch (e) {
    await logError(supabase, "transfer-ticket", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
