// Release-day presave conversion cron worker
// Finds smart_links where is_presave=true, presave_converted=false, release_date <= now()
// For each, refreshes Spotify tokens for all pending presaves and fires save-track API call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

async function refreshSpotifyToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find released presave links not yet converted
  const { data: links, error } = await supabase
    .from("smart_links")
    .select("*")
    .eq("is_presave", true)
    .eq("presave_converted", false)
    .lte("release_date", new Date().toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let totalConverted = 0;
  for (const link of links || []) {
    const { data: presaves } = await supabase
      .from("smart_link_presaves")
      .select("*")
      .eq("link_id", link.id)
      .is("converted_at", null);

    for (const p of presaves || []) {
      const accessToken = await refreshSpotifyToken(p.spotify_refresh_token);
      if (!accessToken) continue;

      const id = p.spotify_track_id || p.spotify_album_id;
      if (!id) continue;
      const url = p.spotify_track_id
        ? `https://api.spotify.com/v1/me/tracks?ids=${id}`
        : `https://api.spotify.com/v1/me/albums?ids=${id}`;

      const saveRes = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (saveRes.ok) {
        await supabase
          .from("smart_link_presaves")
          .update({ converted_at: new Date().toISOString() })
          .eq("id", p.id);
        totalConverted++;
      }
    }

    await supabase
      .from("smart_links")
      .update({ presave_converted: true })
      .eq("id", link.id);
  }

  return new Response(
    JSON.stringify({ links_processed: links?.length || 0, total_converted: totalConverted }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
