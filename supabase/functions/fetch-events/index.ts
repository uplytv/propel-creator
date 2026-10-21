// supabase/functions/fetch-events/index.ts
// Syncs upcoming music festivals from Ticketmaster Discovery API into events_external.
// Uses the affiliate-friendly public URL on each event so UPLY can layer attribution later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("TICKETMASTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "TICKETMASTER_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const classification = url.searchParams.get("classification") ?? "music";
    const size = url.searchParams.get("size") ?? "50";
    const country = url.searchParams.get("country") ?? "US";

    const tmUrl = `${TM_BASE}?apikey=${apiKey}&classificationName=${classification}&size=${size}&countryCode=${country}&sort=date,asc`;
    const res = await fetch(tmUrl);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ticketmaster API ${res.status}: ${body}`);
    }
    const json = await res.json();
    const events: any[] = json?._embedded?.events ?? [];

    let upserted = 0;
    for (const ev of events) {
      const venue = ev?._embedded?.venues?.[0];
      const image =
        ev?.images?.find((i: any) => i.ratio === "16_9" && i.width >= 800)?.url ??
        ev?.images?.[0]?.url ??
        null;
      const startISO = ev?.dates?.start?.dateTime ?? ev?.dates?.start?.localDate ?? null;
      const priceRange = ev?.priceRanges?.[0];

      const row = {
        source: "ticketmaster",
        external_id: ev.id,
        title: ev.name,
        description: ev?.info ?? ev?.pleaseNote ?? null,
        image_url: image,
        city: venue?.city?.name ?? null,
        country: venue?.country?.name ?? null,
        venue_name: venue?.name ?? null,
        start_date: startISO,
        end_date: ev?.dates?.end?.dateTime ?? null,
        category: ev?.classifications?.[0]?.genre?.name ?? "Music",
        affiliate_url: ev.url,
        min_price: priceRange?.min ?? null,
        max_price: priceRange?.max ?? null,
        currency: priceRange?.currency ?? "USD",
        is_featured: (ev?.rank ?? 0) > 80 || /coachella|edc|tomorrowland|lollapalooza|ultra|rolling loud/i.test(ev.name ?? ""),
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("events_external")
        .upsert(row, { onConflict: "source,external_id" });
      if (!error) upserted++;
    }

    return new Response(
      JSON.stringify({ ok: true, fetched: events.length, upserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
