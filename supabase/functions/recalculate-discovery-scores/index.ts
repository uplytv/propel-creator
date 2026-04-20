// Recalculates UPLY discovery scores across videos / clips / recordings.
// score = (views*.15 + watch_pct*.25 + likes*.20 + comments*.15 + shares*.15 + saves*.10)
//         * recency_decay * new_creator_boost
// Personalization (category_relevance) is applied at query time per viewer.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Pull all rows (cap at 5000 for safety; cron runs every 30 min)
  const { data: rows, error } = await supabase
    .from("video_discovery_scores")
    .select("id, content_id, content_type, creator_id, is_new_creator_boosted, created_at")
    .limit(5000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let updated = 0;
  for (const row of rows ?? []) {
    // 1. Pull live counters from source table
    let views = 0, likes = 0, comments = 0, shares = 0;
    if (row.content_type === "video") {
      const { data: v } = await supabase.from("videos")
        .select("view_count, like_count, comment_count").eq("id", row.content_id).maybeSingle();
      views = v?.view_count ?? 0; likes = v?.like_count ?? 0; comments = v?.comment_count ?? 0;
    } else if (row.content_type === "clip") {
      const { data: c } = await supabase.from("clips")
        .select("view_count, like_count, share_count").eq("id", row.content_id).maybeSingle();
      views = c?.view_count ?? 0; likes = c?.like_count ?? 0; shares = c?.share_count ?? 0;
    } else {
      const { data: r } = await supabase.from("stream_recordings")
        .select("view_count, like_count, share_count").eq("id", row.content_id).maybeSingle();
      views = r?.view_count ?? 0; likes = r?.like_count ?? 0; shares = r?.share_count ?? 0;
    }

    // 2. Average watch percentage (last 500 watch events)
    const { data: events } = await supabase
      .from("watch_time_events")
      .select("watch_pct")
      .eq("content_id", row.content_id)
      .eq("content_type", row.content_type)
      .order("created_at", { ascending: false })
      .limit(500);
    const watchPct = events && events.length > 0
      ? events.reduce((s, e: any) => s + Number(e.watch_pct || 0), 0) / events.length
      : 0;

    // 3. Compute weighted base
    // Normalize views to "log" so a viral spike doesn't dominate watch_time_pct
    const viewsNorm = Math.log10(views + 1) * 20; // ~1 view ≈ 6pts, 1k ≈ 60
    const base =
      viewsNorm * 0.15 +
      watchPct * 0.25 +     // 0..100
      Math.log10(likes + 1) * 20 * 0.20 +
      Math.log10(comments + 1) * 20 * 0.15 +
      Math.log10(shares + 1) * 20 * 0.15 +
      0; // saves not yet wired (kept at 0 weight in this revision)

    // 4. Recency decay: 1 / (1 + hours * 0.1)
    const hours = (Date.now() - new Date(row.created_at).getTime()) / 3_600_000;
    const recencyDecay = 1 / (1 + hours * 0.1);

    // 5. New-creator boost
    const boost = row.is_new_creator_boosted ? 1.5 : 1.0;

    const score = Math.max(0.001, base * recencyDecay * boost);

    await supabase.from("video_discovery_scores").update({
      views, likes, comments, shares,
      watch_time_avg_pct: Number(watchPct.toFixed(2)),
      score: Number(score.toFixed(4)),
      last_calculated_at: new Date().toISOString(),
    }).eq("id", row.id);

    updated++;
  }

  return new Response(JSON.stringify({ updated, total: rows?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
