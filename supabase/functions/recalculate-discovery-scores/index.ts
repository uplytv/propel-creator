// UPLY Discovery Engine V2 — recalculates scores every 5 minutes.
//
// final_score = base * recency * creator_boost * momentum * quality
// (personalization is applied per-viewer at query time, not stored here)
//
//   base = watch_pct*0.30 + completion*0.20 + log(shares)*0.15 +
//          log(saves)*0.12 + log(comments)*0.10 + log(likes)*0.08 +
//          log(clicks)*0.05   (each log term scaled to ~0..100)
//   recency = e^(-0.05 * hours)         (live = 3.0 always)
//   creator_boost = 2.0 / 1.5 / 1.0     (new / growing / established)
//   momentum = 1.0 → 1.5 → 2.0 → 3.0    (10+ in 30min / top1% / shares 2x in 30min)
//   quality = 1.0 → 1.5                 (thumb + desc + tags + verified)
import { createClient } from "jsr:@supabase/supabase-js@2";
import { requireInternal, withCors } from "../_shared/security.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: rows, error } = await supabase
    .from("video_discovery_scores")
    .select("id, content_id, content_type, creator_id, is_new_creator_boosted, is_live, created_at, prev_shares_snapshot, last_burst_at")
    .order("last_calculated_at", { ascending: true })
    .limit(8000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pre-load follower counts for creator_boost tier
  const creatorIds = [...new Set((rows ?? []).map((r) => r.creator_id))];
  const { data: followerRows } = await supabase
    .from("follows").select("following_id").in("following_id", creatorIds);
  const followerCount = new Map<string, number>();
  for (const f of followerRows ?? []) {
    followerCount.set((f as any).following_id, (followerCount.get((f as any).following_id) ?? 0) + 1);
  }

  let updated = 0;
  const now = Date.now();

  for (const row of rows ?? []) {
    // 1. Live counters from source table
    let views = 0, likes = 0, comments = 0, shares = 0, saves = 0, clicks = 0;
    let hasThumbnail = false, hasDescription = false, hasTags = false;

    if (row.content_type === "video") {
      const { data: v } = await supabase.from("videos")
        .select("view_count, like_count, comment_count, thumbnail_url, description, tags").eq("id", row.content_id).maybeSingle();
      views = v?.view_count ?? 0; likes = v?.like_count ?? 0; comments = v?.comment_count ?? 0;
      hasThumbnail = !!v?.thumbnail_url;
      hasDescription = !!v?.description && v.description.length > 100;
      hasTags = !!v?.tags && v.tags.length > 0;
    } else if (row.content_type === "clip") {
      const { data: c } = await supabase.from("clips")
        .select("view_count, like_count, share_count").eq("id", row.content_id).maybeSingle();
      views = c?.view_count ?? 0; likes = c?.like_count ?? 0; shares = c?.share_count ?? 0;
    } else if (row.content_type === "recording") {
      const { data: r } = await supabase.from("stream_recordings")
        .select("view_count, like_count, share_count").eq("id", row.content_id).maybeSingle();
      views = r?.view_count ?? 0; likes = r?.like_count ?? 0; shares = r?.share_count ?? 0;
    } else if (row.content_type === "post") {
      const { data: p } = await supabase.from("community_posts")
        .select("like_count, comment_count, image_url, body").eq("id", row.content_id).maybeSingle();
      likes = p?.like_count ?? 0; comments = p?.comment_count ?? 0;
      hasThumbnail = !!p?.image_url; hasDescription = !!p?.body && p.body.length > 100;
    } else if (row.content_type === "stream") {
      const { data: s } = await supabase.from("mux_live_streams")
        .select("viewer_count, status").eq("id", row.content_id).maybeSingle();
      views = s?.viewer_count ?? 0;
      // refresh is_live flag
      if (s && (s as any).status !== (row.is_live ? "active" : "ended")) {
        // handled by trigger but keep snapshot accurate
      }
    } else if (row.content_type === "product") {
      const { data: p } = await supabase.from("products")
        .select("sales, image_url, description").eq("id", row.content_id).maybeSingle();
      views = (p as any)?.sales ?? 0;
      hasThumbnail = !!(p as any)?.image_url;
      hasDescription = !!(p as any)?.description && (p as any).description.length > 100;
    }

    // 2. Watch percentage (videos / clips / recordings only)
    let watchPct = 0, completionRate = 0;
    if (["video", "clip", "recording"].includes(row.content_type)) {
      const { data: events } = await supabase
        .from("watch_time_events")
        .select("watch_pct")
        .eq("content_id", row.content_id)
        .eq("content_type", row.content_type)
        .order("created_at", { ascending: false })
        .limit(500);
      if (events && events.length > 0) {
        watchPct = events.reduce((s, e: any) => s + Number(e.watch_pct || 0), 0) / events.length;
        completionRate = (events.filter((e: any) => Number(e.watch_pct || 0) >= 90).length / events.length) * 100;
      }
    }

    // 3. Base score
    const base =
      watchPct * 0.30 +
      completionRate * 0.20 +
      Math.log10(shares + 1) * 20 * 0.15 +
      Math.log10(saves + 1) * 20 * 0.12 +
      Math.log10(comments + 1) * 20 * 0.10 +
      Math.log10(likes + 1) * 20 * 0.08 +
      Math.log10(clicks + 1) * 20 * 0.05 +
      Math.log10(views + 1) * 8;  // small view-floor so silent posts still get a score

    // 4. Recency (live = 3.0 always)
    const hours = (now - new Date(row.created_at).getTime()) / 3_600_000;
    const recency = row.is_live ? 3.0 : Math.exp(-0.05 * hours);

    // 5. Creator boost
    const fc = followerCount.get(row.creator_id) ?? 0;
    const creatorAgeMs = now - new Date(row.created_at).getTime();
    const isNew = row.is_new_creator_boosted || (fc < 500 && creatorAgeMs < 90 * 86400_000);
    const creatorBoost = isNew ? 2.0 : fc < 10000 ? 1.5 : 1.0;

    // 6. Momentum — share burst detection
    let momentum = 1.0;
    const prevShares = row.prev_shares_snapshot ?? 0;
    if (shares >= 10 && prevShares > 0 && shares >= prevShares * 2) {
      momentum = 3.0;  // going viral
    } else if (shares + likes + comments >= 10 && hours <= 0.5) {
      momentum = 1.5;  // 10+ interactions in first 30min
    }

    // 7. Quality
    let quality = 1.0;
    if (hasThumbnail) quality += 0.1;
    if (hasDescription) quality += 0.1;
    if (hasTags) quality += 0.1;
    if (quality > 1.5) quality = 1.5;

    const score = Math.max(0.001, base * recency * creatorBoost * momentum * quality);

    await supabase.from("video_discovery_scores").update({
      views, likes, comments, shares,
      watch_time_avg_pct: Number(watchPct.toFixed(2)),
      completion_rate: Number(completionRate.toFixed(2)),
      momentum_score: momentum,
      quality_score: quality,
      score: Number(score.toFixed(4)),
      prev_shares_snapshot: shares,
      prev_score_snapshot: Number(score.toFixed(4)),
      last_burst_at: momentum >= 2 ? new Date().toISOString() : row.last_burst_at,
      last_calculated_at: new Date().toISOString(),
    }).eq("id", row.id);

    updated++;
  }

  return new Response(JSON.stringify({ updated, total: rows?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}));
