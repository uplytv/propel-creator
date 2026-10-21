// Subscribe to a presave campaign (email-only or Apple Music).
// Spotify uses the existing spotify-presave-callback OAuth flow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function confirmationHtml(opts: {
  trackTitle: string;
  artistName: string;
  releaseDate: string;
  platform: "spotify" | "apple_music" | "email_only";
  coverUrl?: string | null;
}) {
  const phrase =
    opts.platform === "spotify"
      ? "automatically add it to your Spotify library"
      : opts.platform === "apple_music"
      ? "email you, update your Apple Wallet pass, and (if you authorized Apple Music) add it to your library"
      : "send you an email so you can listen on your favorite platform";
  const cover = opts.coverUrl
    ? `<img src="${opts.coverUrl}" alt="" width="240" height="240" style="display:block;margin:0 auto 18px;border-radius:14px;max-width:240px;width:100%;height:auto;" />`
    : "";
  return `<div style="font-family:'Plus Jakarta Sans',-apple-system,sans-serif;background:#0A0A0A;color:#fff;padding:32px 16px;max-width:520px;margin:0 auto;text-align:center;">
    ${cover}
    <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">You're on the list for ${opts.trackTitle}</h1>
    <p style="font-size:14px;color:rgba(255,255,255,0.8);line-height:1.5;margin:0 0 18px;">Thanks for pre-saving <strong>${opts.trackTitle}</strong> by ${opts.artistName}. On ${opts.releaseDate} we'll ${phrase}.</p>
    <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:24px 0 0;">Powered by <a href="https://uply.tv" style="color:#00FF85;text-decoration:none;">UPLY</a></p>
  </div>`;
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { campaign_slug, campaign_id, email, platform, apple_music_user_token } = body as {
      campaign_slug?: string;
      campaign_id?: string;
      email: string;
      platform: "apple_music" | "email_only";
      apple_music_user_token?: string;
    };

    if (!email || !platform || (platform !== "apple_music" && platform !== "email_only")) {
      return new Response(JSON.stringify({ error: "email and valid platform required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let campaign: any = null;
    if (campaign_id) {
      const r = await supabase.from("presave_campaigns").select("*, tracks!inner(title, cover_art_url, creator_id)").eq("id", campaign_id).maybeSingle();
      campaign = r.data;
    } else if (campaign_slug) {
      const r = await supabase.from("presave_campaigns").select("*, tracks!inner(title, cover_art_url, creator_id)").eq("campaign_url_slug", campaign_slug).maybeSingle();
      campaign = r.data;
    }

    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await supabase
      .from("presave_subscribers")
      .upsert(
        {
          campaign_id: campaign.id,
          email,
          platform,
          apple_music_user_token: apple_music_user_token ?? null,
          consent_save_track: platform === "apple_music" && !!apple_music_user_token,
        },
        { onConflict: "campaign_id,email,platform" }
      );

    if (insErr) {
      console.error("[presave-subscribe] insert", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creator } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", campaign.creator_id)
      .maybeSingle();
    const artistName = creator?.display_name || creator?.username || "the artist";
    const releaseDate = new Date(campaign.release_at).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (RESEND_API_KEY) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "UPLY <notify@notify.uply.tv>",
          to: email,
          subject: `You're on the list for ${campaign.tracks.title}`,
          html: confirmationHtml({
            trackTitle: campaign.tracks.title,
            artistName,
            releaseDate,
            platform,
            coverUrl: campaign.cover_art_url || campaign.tracks.cover_art_url,
          }),
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
