import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const sixHoursFromNow = new Date(
      Date.now() + 6 * 60 * 60 * 1000
    ).toISOString();

    const [
      liveStreams,
      scheduledStreams,
      recentRecordings,
      activeChannels,
      tuneInCreators,
      inactiveCount,
    ] = await Promise.all([
      supabase
        .from("mux_live_streams")
        .select(
          "id, title, mux_playback_id, viewer_count, user_id, channel_category, is_primetime, scheduled_at"
        )
        .eq("status", "active")
        .order("viewer_count", { ascending: false })
        .limit(6),

      supabase
        .from("mux_live_streams")
        .select(
          "id, title, mux_playback_id, scheduled_at, user_id, channel_category, series_name, episode_number"
        )
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .lte("scheduled_at", sixHoursFromNow)
        .order("scheduled_at", { ascending: true })
        .limit(6),

      supabase
        .from("stream_recordings")
        .select(
          "id, title, playback_id, duration_seconds, view_count, created_at, creator_id"
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6),

      supabase
        .from("uply_channels")
        .select("*")
        .eq("is_active", true)
        .order("creator_count", { ascending: false }),

      supabase
        .from("profiles")
        .select(
          "user_id, display_name, avatar_url, username, channel_category, channel_tagline"
        )
        .not("creator_type", "is", null)
        .order("created_at", { ascending: false })
        .limit(8),

      supabase
        .from("uply_channels")
        .select("id", { count: "exact", head: true })
        .eq("is_active", false),
    ]);

    return new Response(
      JSON.stringify({
        liveStreams: liveStreams.data || [],
        scheduledStreams: scheduledStreams.data || [],
        recentRecordings: recentRecordings.data || [],
        activeChannels: activeChannels.data || [],
        tuneInCreators: tuneInCreators.data || [],
        inactiveChannelCount: inactiveCount.count || 0,
        fetchedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
