// Sync global events from Ticketmaster + Eventbrite + SeatGeek into events_global
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isInternalCaller, requireUser, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERSIAN_KEYWORDS = [
  "persian", "iranian", "farsi", "nowruz", "eid", "omid", "andy", "googoosh",
  "dariush", "ebi", "shadmehr", "morteza", "leila forouhar", "moein", "hayedeh",
  "sirvan", "sogand", "tataloo", "amir tataloo", "yas", "hichkas", "behzad leito",
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

// Wrap ticket URL with affiliate tag if configured
function withAffiliate(url: string | null, source: string): string | null {
  if (!url) return null;
  const affId = Deno.env.get("TICKETMASTER_AFFILIATE_ID");
  if (source === "ticketmaster" && affId) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}camefrom=${encodeURIComponent(affId)}`;
  }
  return url;
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
    const lat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : null;
    const lng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : null;
    const ticketUrl = e.url || null;
    return {
      external_id: `tm_${e.id}`,
      title,
      date: e?.dates?.start?.dateTime || (e?.dates?.start?.localDate ? `${e.dates.start.localDate}T00:00:00Z` : null),
      venue: venue?.name || null,
      city: venue?.city?.name || null,
      country: venue?.country?.name || venue?.country?.countryCode || null,
      latitude: lat,
      longitude: lng,
      category: cat,
      image_url: image || null,
      ticket_url: ticketUrl,
      affiliate_url: withAffiliate(ticketUrl, "ticketmaster"),
      artist_name: artist,
      source: "ticketmaster",
      is_persian: isPersian(title, artist, venue?.name),
      synced_at: new Date().toISOString(),
    };
  });
}

async function fetchEventbrite(token: string) {
  const cities = ["Los Angeles", "New York", "London", "Toronto", "Dubai", "Berlin", "Paris", "Sydney"];
  const all: any[] = [];
  for (const city of cities) {
    try {
      const url = `https://www.eventbriteapi.com/v3/events/search/?location.address=${encodeURIComponent(city)}&expand=venue&sort_by=date`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) continue;
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
          latitude: venue?.latitude ? parseFloat(venue.latitude) : null,
          longitude: venue?.longitude ? parseFloat(venue.longitude) : null,
          category: categorize(e?.category_id),
          image_url: e?.logo?.url || null,
          ticket_url: e?.url || null,
          affiliate_url: e?.url || null,
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

async function fetchSeatGeek(clientId: string) {
  // SeatGeek has solid global coverage and a free tier. Pulls upcoming events worldwide.
  const url = `https://api.seatgeek.com/2/events?client_id=${clientId}&per_page=200&sort=datetime_local.asc`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("SeatGeek fetch failed:", res.status);
    return [];
  }
  const data = await res.json();
  const events = data?.events ?? [];
  return events.map((e: any) => {
    const venue = e?.venue;
    const performer = e?.performers?.[0];
    const title = e?.title || performer?.name || "Untitled Event";
    const ticketUrl = e?.url || null;
    return {
      external_id: `sg_${e.id}`,
      title,
      date: e?.datetime_utc ? `${e.datetime_utc}Z` : null,
      venue: venue?.name || null,
      city: venue?.city || null,
      country: venue?.country || null,
      latitude: venue?.location?.lat ?? null,
      longitude: venue?.location?.lon ?? null,
      category: categorize(e?.type),
      image_url: performer?.image || e?.performers?.find((p: any) => p?.image)?.image || null,
      ticket_url: ticketUrl,
      affiliate_url: ticketUrl,
      artist_name: performer?.name || null,
      source: "seatgeek",
      is_persian: isPersian(title, performer?.name, venue?.name),
      synced_at: new Date().toISOString(),
    };
  });
}

Deno.serve(withCors(async (req) => {
  // SECURITY: signed-in users (or internal callers) only.
  if (req.method !== 'OPTIONS' && !isInternalCaller(req)) {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const tmKey = Deno.env.get("TICKETMASTER_API_KEY");
  const ebKey = Deno.env.get("EVENTBRITE_API_KEY");
  const sgKey = Deno.env.get("SEATGEEK_CLIENT_ID");

  const [tmEvents, ebEvents, sgEvents] = await Promise.all([
    tmKey ? fetchTicketmaster(tmKey) : Promise.resolve([]),
    ebKey ? fetchEventbrite(ebKey) : Promise.resolve([]),
    sgKey ? fetchSeatGeek(sgKey) : Promise.resolve([]),
  ]);

  const all = [...tmEvents, ...ebEvents, ...sgEvents];
  const persianCount = all.filter((e) => e.is_persian).length;

  let upserted = 0;
  if (all.length > 0) {
    for (let i = 0; i < all.length; i += 100) {
      const chunk = all.slice(i, i + 100);
      const { error } = await supabase
        .from("events_global")
        .upsert(chunk, { onConflict: "external_id" });
      if (error) console.error("Upsert error:", error);
      else upserted += chunk.length;
    }
  }

  const result = {
    success: true,
    fetched: all.length,
    ticketmaster: tmEvents.length,
    eventbrite: ebEvents.length,
    seatgeek: sgEvents.length,
    upserted,
    persian: persianCount,
  };
  console.log("[sync-global-events]", result);

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}));
