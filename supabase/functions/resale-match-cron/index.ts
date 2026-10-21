import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, logError } from "../_shared/eventsCors.ts";
import { requireInternal, withCors } from "../_shared/security.ts";

// Cron job: when a new listing appears at or below a watcher's max_bid, push notification.
serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  try {
    const cutoff = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // last 6 min of new listings
    const { data: newListings } = await supabase
      .from("ticket_listings")
      .select("id, event_id, asking_price_cents, ticket_id")
      .eq("status", "active")
      .gte("created_at", cutoff);

    let matchCount = 0;
    for (const listing of newListings ?? []) {
      const { data: watchers } = await supabase
        .from("event_waitlist")
        .select("user_id, max_bid_cents")
        .eq("event_id", listing.event_id)
        .is("matched_at", null);
      for (const w of watchers ?? []) {
        if (!w.max_bid_cents || listing.asking_price_cents <= w.max_bid_cents) {
          await supabase.from("notifications").insert({
            user_id: w.user_id,
            type: "resale_match",
            title: "🎟️ Ticket Available",
            message: `A ticket just dropped at $${(listing.asking_price_cents / 100).toFixed(2)} — within your bid.`,
            link: `/events/${listing.event_id}`,
            reference_id: listing.id,
          });
          matchCount++;
        }
      }
    }
    return json({ ok: true, scanned: newListings?.length ?? 0, matches: matchCount });
  } catch (e) {
    await logError(supabase, "resale-match-cron", e, null, null);
    return json({ error: (e as Error).message }, 500);
  }
}));
