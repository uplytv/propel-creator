// Sync global events from Ticketmaster + Eventbrite into events_global
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERSIAN_KEYWORDS = [
  "persian", "iranian", "farsi", "nowruz", "eid", "omid", "andy", "googoosh",
  "dariush", "ebi", "shadmehr", "morteza", "leila forouhar", "moein", "hayedeh",
];

function isPersian(...fields: (string | null | undefined)[]): boolean {
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return PERSIAN_KEYWORDS.some((kw) => haystack.includes(kw));
}

function categorize(raw: string | null | undefined): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("music") || s.includes("concert")) return "music";
  if (s.includes("sport")) return "sports";
  if (s.includes("festival")) return "festival";
  if (s.includes("art") || s.includes("theatre") || s.includes("theater")) return "arts";
  return "other";
}

async function fetchTicketmaster(apiKey: string) {
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&size=200&sort=date,asc&classificationName=music,sports,arts,festival`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Ticketmaster fetch failed:", res.status, await res.text());
    return [];
  }
  const data = await res.json();
  const events = data?._embedded?.events ?? [];
  return events.map((e: any) => {
    const venue = e?._embedded?.venues?.[0];
    const attraction = e?._embedded?.attractions?.[0];
    const image = (e.images || []).sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0]?.url;
    const title = e.name || "Untitled Event";
    const artist = attraction?.name || null;
    const cat = categorize(e?.classifications?.[0]?.segment?.name);
    return {
      external_id: `tm_${e.id}`,
      title,
      date: e?.dates?.start?.dateTime || (e?.dates?.start?.localDate ? `${e.dates.start.localDate}T00:00:00Z` : null),
      venue: venue?.name || null,
      city: venue?.city?.name || null,
      country: venue?.country?.name || venue?.country?.countryCode || null,
      category: cat,
      image_url: image || null,
      ticket_url: e.url || null,
      artist_name: artist,
      source: "ticketmaster",
      is_persian: isPersian(title, artist, venue?.name),
      synced_at: new Date().toISOString(),
    };
  });
}

async function fetchEventbrite(token: string) {
  // Eventbrite's public search was deprecated; use organization events as a fallback or featured events.
  // We use the public events endpoint via location-based search on major cities.
  const cities = ["Los Angeles", "New York", "London", "Toronto", "Dubai", "Berlin", "Paris", "Sydney"];
  const all: any[] = [];
  for (const city of cities) {
    try {
      const url = `https://www.eventbriteapi.com/v3/events/search/?location.address=${encodeURIComponent(city)}&expand=venue&sort_by=date`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        console.warn(`Eventbrite fetch failed for ${city}:`, res.status);
        continue;
      }
      const data = await res.json();
      const events = data?.events ?? [];
      for (const e of events.slice(0, 25)) {
        const title = e?.name?.text || "Untitled Event";
        const venue = e?.venue;
        all.push({
          external_id: `eb_${e.id}`,
          title,
          date: e?.start?.utc || null,
          venue: venue?.name || null,
          city: venue?.address?.city || city,
          country: venue?.address?.country || null,
          category: categorize(e?.category_id),
          image_url: e?.logo?.url || null,
          ticket_url: e?.url || null,
          artist_name: null,
          source: "eventbrite",
          is_persian: isPersian(title, e?.description?.text),
          synced_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`Eventbrite error for ${city}:`, err);
    }
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tmKey = Deno.env.get("TICKETMASTER_API_KEY");
  const ebKey = Deno.env.get("EVENTBRITE_API_KEY");

  const [tmEvents, ebEvents] = await Promise.all([
    tmKey ? fetchTicketmaster(tmKey) : Promise.resolve([]),
    ebKey ? fetchEventbrite(ebKey) : Promise.resolve([]),
  ]);

  const all = [...tmEvents, ...ebEvents];
  const persianCount = all.filter((e) => e.is_persian).length;

  let upserted = 0;
  if (all.length > 0) {
    // Upsert in chunks of 100
    for (let i = 0; i < all.length; i += 100) {
      const chunk = all.slice(i, i + 100);
      const { error } = await supabase
        .from("events_global")
        .upsert(chunk, { onConflict: "external_id" });
      if (error) {
        console.error("Upsert error:", error);
      } else {
        upserted += chunk.length;
      }
    }
  }

  const result = {
    success: true,
    fetched: all.length,
    ticketmaster: tmEvents.length,
    eventbrite: ebEvents.length,
    upserted,
    persian: persianCount,
  };
  console.log("[sync-global-events]", result);

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
