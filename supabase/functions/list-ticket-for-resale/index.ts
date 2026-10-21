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
    const { ticket_id, asking_price_cents, listing_type = "fixed" } = await req.json();
    if (!ticket_id || !asking_price_cents) return err("ticket_id and asking_price_cents required");

    const { data: ticket } = await supabase
      .from("tickets")
      .select("*, events!inner(*), ticket_tiers(price_cents)")
      .eq("id", ticket_id)
      .single();
    if (!ticket) return err("Ticket not found", 404);
    if (ticket.owner_id !== userId) return err("Not your ticket", 403);
    if (ticket.status !== "active") return err(`Cannot list a ${ticket.status} ticket`);

    const event = (ticket as any).events;
    if (!event.resale_allowed) return err("Resale disabled for this event");

    const originalPrice =
      (ticket as any).ticket_tiers?.price_cents ?? ticket.purchase_price_cents ?? 0;
    const cap = Math.round((originalPrice * (event.resale_price_cap_pct ?? 120)) / 100);
    if (asking_price_cents > cap)
      return err(`Price exceeds cap of $${(cap / 100).toFixed(2)}`, 400);

    const { data: listing, error: lErr } = await supabase
      .from("ticket_listings")
      .insert({
        ticket_id,
        seller_id: userId,
        event_id: event.id,
        asking_price_cents,
        listing_type,
      })
      .select()
      .single();
    if (lErr) throw lErr;

    await supabase.from("tickets").update({ status: "listed_for_resale" }).eq("id", ticket_id);

    return json({ listing_id: listing.id });
  } catch (e) {
    await logError(supabase, "list-ticket-for-resale", e, null, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
