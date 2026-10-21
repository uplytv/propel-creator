// Generates 6 daily mixes per active user, seeded from their top genres.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: profiles } = await supabase
      .from("user_taste_profiles")
      .select("user_id, top_genres")
      .gte("refreshed_at", new Date(Date.now() - 30 * 86400_000).toISOString())
      .limit(2000);

    let created = 0;

    for (const prof of profiles ?? []) {
      const genres = (prof as any).top_genres as string[];
      if (!genres?.length) continue;
      const slots = genres.slice(0, 6);

      for (let i = 0; i < slots.length; i++) {
        const genre = slots[i];
        const { data: tracks } = await supabase
          .from("tracks")
          .select("id")
          .eq("is_published", true)
          .eq("audio_status", "ready")
          .eq("genre", genre)
          .order("play_count", { ascending: false })
          .limit(30);

        const trackIds = (tracks ?? []).map((t: any) => t.id);
        if (!trackIds.length) continue;

        await supabase.from("daily_mixes").upsert({
          user_id: (prof as any).user_id,
          slot: i + 1,
          title: `${genre} Mix`,
          description: `Daily ${genre} picks for you`,
          seed_genres: [genre],
          track_ids: trackIds,
          refreshed_at: new Date().toISOString(),
        }, { onConflict: "user_id,slot" });
        created++;
      }
    }

    return new Response(JSON.stringify({ ok: true, mixes: created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
