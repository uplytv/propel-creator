// Refreshes user_taste_profiles from recent listening history.
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
    // Pull recent active listeners (last 30d)
    const { data: listeners } = await supabase
      .from("track_plays")
      .select("user_id")
      .gte("played_at", new Date(Date.now() - 30 * 86400_000).toISOString())
      .not("user_id", "is", null)
      .limit(5000);

    const uniqueUsers = Array.from(new Set((listeners ?? []).map((r: any) => r.user_id)));
    let updated = 0;

    for (const userId of uniqueUsers) {
      const { data: plays } = await supabase
        .from("track_plays")
        .select("track_id, tracks!inner(genre, artist_id, bpm)")
        .eq("user_id", userId)
        .gte("played_at", new Date(Date.now() - 60 * 86400_000).toISOString())
        .limit(500);

      if (!plays || plays.length === 0) continue;

      const genreCount = new Map<string, number>();
      const artistCount = new Map<string, number>();
      const bpms: number[] = [];

      for (const p of plays as any[]) {
        const t = p.tracks;
        if (t?.genre) genreCount.set(t.genre, (genreCount.get(t.genre) ?? 0) + 1);
        if (t?.artist_id) artistCount.set(t.artist_id, (artistCount.get(t.artist_id) ?? 0) + 1);
        if (typeof t?.bpm === "number") bpms.push(t.bpm);
      }

      const topGenres = [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);
      const topArtists = [...artistCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([a]) => a);
      const avgBpm = bpms.length ? bpms.reduce((a, b) => a + b, 0) / bpms.length : null;
      const bpmMin = bpms.length ? Math.min(...bpms) : null;
      const bpmMax = bpms.length ? Math.max(...bpms) : null;

      await supabase.from("user_taste_profiles").upsert({
        user_id: userId,
        top_genres: topGenres,
        top_artist_ids: topArtists,
        avg_bpm: avgBpm,
        bpm_min: bpmMin,
        bpm_max: bpmMax,
        refreshed_at: new Date().toISOString(),
      });
      updated++;
    }

    return new Response(JSON.stringify({ ok: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
