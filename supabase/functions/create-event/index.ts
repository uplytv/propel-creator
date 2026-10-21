import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { corsHeaders, json, err, logError } from "../_shared/eventsCors.ts";
import { withCors } from "../_shared/security.ts";

interface TierInput {
  name: string;
  description?: string;
  price_cents: number;
  quantity_total: number;
  per_user_limit?: number;
  perks?: unknown[];
  sort_order?: number;
  pricing_mode?: "fixed" | "dynamic";
  min_price_cents?: number;
  max_price_cents?: number;
  squad_min_size?: number;
  member_only_until?: string;
}

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let userId: string | null = null;
  let body: any = null;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return err("Unauthorized", 401);
    const token = auth.replace("Bearer ", "");
    const { data: u } = await supabase.auth.getUser(token);
    if (!u?.user) return err("Unauthorized", 401);
    userId = u.user.id;

    body = await req.json();
    const {
      title,
      description,
      event_type,
      cover_image_url,
      gallery_urls,
      category,
      tags,
      venue_name,
      venue_address,
      lat,
      lng,
      starts_at,
      ends_at,
      timezone,
      doors_open_at,
      age_restriction,
      lineup,
      capacity,
      visibility,
      ticket_sales_open_at,
      ticket_sales_close_at,
      resale_allowed,
      resale_price_cap_pct,
      refund_policy,
      co_host_ids,
      tiers,
      publish_now,
    } = body ?? {};

    // Validate
    if (!title || typeof title !== "string" || title.length < 3 || title.length > 200)
      return err("Title required (3-200 chars)");
    if (!event_type || !["in_person", "virtual", "hybrid"].includes(event_type))
      return err("Invalid event_type");
    if (!starts_at || !ends_at) return err("starts_at and ends_at required");
    if (new Date(starts_at) >= new Date(ends_at)) return err("ends_at must be after starts_at");
    if (!Array.isArray(tiers) || tiers.length === 0) return err("At least one ticket tier required");
    for (const t of tiers as TierInput[]) {
      if (!t.name || t.price_cents == null || t.quantity_total == null)
        return err(`Invalid tier: ${JSON.stringify(t)}`);
      if (t.price_cents < 0 || t.quantity_total < 1)
        return err(`Tier values out of range: ${t.name}`);
    }

    // Insert event
    const { data: event, error: ev } = await supabase
      .from("events")
      .insert({
        creator_id: userId,
        co_host_ids: co_host_ids ?? [],
        title,
        description: description ?? "",
        event_type,
        cover_image_url: cover_image_url ?? null,
        gallery_urls: gallery_urls ?? [],
        category: category ?? null,
        tags: tags ?? [],
        venue_name: venue_name ?? null,
        location_name: venue_name ?? null,
        location_address: venue_address ?? null,
        lat: lat ?? null,
        lng: lng ?? null,
        starts_at,
        ends_at,
        timezone: timezone ?? "UTC",
        doors_open_at: doors_open_at ?? null,
        age_restriction: age_restriction ?? "all_ages",
        lineup: lineup ?? [],
        capacity: capacity ?? null,
        visibility: visibility ?? "public",
        ticket_sales_open_at: ticket_sales_open_at ?? null,
        ticket_sales_close_at: ticket_sales_close_at ?? null,
        resale_allowed: resale_allowed ?? true,
        resale_price_cap_pct: resale_price_cap_pct ?? 120,
        refund_policy: refund_policy ?? "no_refunds",
        is_free: (tiers as TierInput[]).every((t) => t.price_cents === 0),
        ticket_price: (tiers as TierInput[])[0].price_cents / 100,
        ticket_quantity: (tiers as TierInput[]).reduce((s, t) => s + t.quantity_total, 0),
        status: publish_now ? "published" : "draft",
      })
      .select()
      .single();
    if (ev || !event) throw ev ?? new Error("Failed to create event");

    // Insert tiers
    const tierRows = (tiers as TierInput[]).map((t, i) => ({
      event_id: event.id,
      name: t.name,
      description: t.description ?? null,
      price_cents: t.price_cents,
      quantity_total: t.quantity_total,
      per_user_limit: t.per_user_limit ?? 8,
      perks: t.perks ?? [],
      sort_order: t.sort_order ?? i,
      pricing_mode: t.pricing_mode ?? "fixed",
      min_price_cents: t.min_price_cents ?? null,
      max_price_cents: t.max_price_cents ?? null,
      squad_min_size: t.squad_min_size ?? null,
      member_only_until: t.member_only_until ?? null,
    }));
    const { error: tierErr } = await supabase.from("ticket_tiers").insert(tierRows);
    if (tierErr) {
      // rollback by deleting the event
      await supabase.from("events").delete().eq("id", event.id);
      throw tierErr;
    }

    return json({ event_id: event.id, slug: event.slug, status: event.status });
  } catch (e) {
    await logError(supabase, "create-event", e, body, userId);
    return err((e as Error).message ?? "Failed", 500);
  }
}));
