// Apple Music presave (scaffold).
// Stores a fan presave with provider='apple' and the Apple Music user token.
// On release day the smartlink-release-cron will use the user token + Apple
// Developer credentials to add the album to each fan's library.
//
// REQUIRED SECRETS for full functionality (set in Lovable Cloud secrets):
//   APPLE_MUSIC_DEVELOPER_TOKEN  — long-lived JWT signed with your MusicKit private key
// Optional (only if you want this function to mint dev tokens itself in future):
//   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_MUSIC_PRIVATE_KEY
//
// Without APPLE_MUSIC_DEVELOPER_TOKEN this function still records the presave
// (so fans aren't blocked) and conversion is deferred to release day.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function extractAppleCatalogId(appleUrl: string): string | null {
  if (!appleUrl) return null;
  const m =
    appleUrl.match(/\/album\/[^/]+\/(\d+)/) ||
    appleUrl.match(/[?&]i=(\d+)/) ||
    appleUrl.match(/\/(\d+)(?:\?|$)/);
  return m ? m[1] : null;
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { link_slug, user_token, fan_email } = body as {
      link_slug?: string;
      user_token?: string;
      fan_email?: string;
    };

    if (!link_slug || !user_token) {
      return new Response(
        JSON.stringify({ error: "link_slug and user_token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: link, error: linkErr } = await supabase
      .from("smart_links")
      .select("id, slug, title, cover_image_url, release_date, platforms")
      .eq("slug", link_slug)
      .maybeSingle();

    if (linkErr || !link) {
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platforms = (link.platforms || {}) as Record<string, string>;
    const appleMusicUrl = platforms.apple_music || "";
    const catalogId = extractAppleCatalogId(appleMusicUrl);

    const releaseDate = link.release_date ? new Date(link.release_date) : null;
    const isReleased = !releaseDate || releaseDate <= new Date();

    let convertedAt: string | null = null;
    let conversionNote: string | undefined;

    const devToken = Deno.env.get("APPLE_MUSIC_DEVELOPER_TOKEN");

    // If released and we have everything we need, save to library now.
    if (isReleased && catalogId && devToken) {
      try {
        const addRes = await fetch(
          `https://api.music.apple.com/v1/me/library?ids[albums]=${catalogId}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${devToken}`,
              "Music-User-Token": user_token,
            },
          },
        );
        if (addRes.ok || addRes.status === 202) {
          convertedAt = new Date().toISOString();
        } else {
          conversionNote = `Apple Music API ${addRes.status}`;
        }
      } catch (e) {
        conversionNote = `Apple Music fetch failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else if (!devToken) {
      conversionNote = "Apple Music developer token not configured — presave stored, will convert on release day if configured";
    }

    // Record the presave (idempotent on link_id + fan_email + provider)
    const { error: insertErr } = await supabase.from("smart_link_presaves").insert({
      link_id: link.id,
      fan_email: fan_email || null,
      provider: "apple",
      apple_music_user_token: user_token,
      converted_at: convertedAt,
    });

    if (insertErr && !/duplicate/i.test(insertErr.message)) {
      console.error("apple-presave insert failed", insertErr);
    }

    // Capture email separately (best-effort, ignore conflicts)
    if (fan_email) {
      await supabase
        .from("smart_link_email_captures")
        .insert({ link_id: link.id, email: fan_email, source: "presave_apple" })
        .then(() => {}, () => {});
    }

    return new Response(
      JSON.stringify({
        success: true,
        converted: !!convertedAt,
        title: link.title,
        cover_image_url: link.cover_image_url,
        note: conversionNote,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("apple-presave error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}));
