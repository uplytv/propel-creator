import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError } from "../_shared/eventsCors.ts";

serve(async (req) => {
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
    const { qr_secret, event_id } = await req.json();
    if (!qr_secret) return err("qr_secret required");

    const { data: ticket } = await supabase
      .from("tickets")
      .select("*, events!inner(creator_id, co_host_ids, title)")
      .eq("qr_code_secret", qr_secret)
      .single();
    if (!ticket) return json({ valid: false, reason: "Ticket not found" }, 200);

    const ev = (ticket as any).events;
    const isOrganizer = ev.creator_id === userId || (ev.co_host_ids ?? []).includes(userId);
    if (!isOrganizer) return err("Not authorized to scan this event", 403);

    if (event_id && ticket.event_id !== event_id)
      return json({ valid: false, reason: "Wrong event" });
    if (ticket.status === "scanned")
      return json({
        valid: false,
        reason: "Already scanned",
        scanned_at: ticket.scanned_at,
      });
    if (ticket.status !== "active")
      return json({ valid: false, reason: `Status: ${ticket.status}` });

    const now = new Date().toISOString();
    await supabase
      .from("tickets")
      .update({ status: "scanned", scanned_at: now, scanned_by: userId, checked_in: true, checked_in_at: now })
      .eq("id", ticket.id);

    return json({
      valid: true,
      ticket_id: ticket.id,
      event_title: ev.title,
      scanned_at: now,
    });
  } catch (e) {
    await logError(supabase, "scan-ticket", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
});
