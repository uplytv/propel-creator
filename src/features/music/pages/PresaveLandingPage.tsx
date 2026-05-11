import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, Mail } from "lucide-react";
import {
  usePresaveCampaignBySlug,
  usePresaveSubscribe,
  usePresaveSubscriberCount,
} from "../hooks/usePresaveCampaign";
import UniversalLinksList from "../components/UniversalLinksList";

const SPOTIFY_CLIENT_ID = "c79c4446c81e4e26a55fd421d8c34fde";

function useCountdown(target?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  if (!target) return "";
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return "out now";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return `Drops in ${d}d ${h}h`;
}

export default function PresaveLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: campaign, isLoading } = usePresaveCampaignBySlug(slug);
  const subscribe = usePresaveSubscribe();
  const { data: count = 0 } = usePresaveSubscriberCount(campaign?.id);
  const countdown = useCountdown(campaign?.release_at);
  const [email, setEmail] = useState("");
  const [creator, setCreator] = useState<any>(null);
  const [track, setTrack] = useState<any>(null);
  const [otherTracks, setOtherTracks] = useState<any[]>([]);

  useEffect(() => {
    if (!campaign) return;
    (async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.from("tracks").select("id, title, cover_art_url, creator_id").eq("id", campaign.track_id).maybeSingle(),
        supabase.from("profiles").select("id, display_name, username").eq("id", campaign.creator_id).maybeSingle(),
      ]);
      setTrack(t);
      setCreator(c);
      const { data: others } = await supabase
        .from("tracks")
        .select("id, title, cover_art_url, play_count")
        .eq("creator_id", campaign.creator_id)
        .neq("id", campaign.track_id)
        .eq("is_published", true)
        .order("play_count", { ascending: false })
        .limit(3);
      setOtherTracks(others ?? []);
    })();
  }, [campaign]);

  const released = campaign?.status === "released";
  const showSpotify = !!campaign?.spotify_track_uri;
  const showApple = !!campaign?.apple_album_id;

  const startSpotifyOAuth = () => {
    if (!email) {
      toast.error("Enter your email first so we can confirm your pre-save.");
      return;
    }
    if (!campaign) return;
    sessionStorage.setItem("presave_pending_email", email);
    sessionStorage.setItem("presave_pending_slug", campaign.campaign_url_slug ?? "");
    const scope = "user-library-modify user-read-email";
    const redirect = `${window.location.origin}/presave/callback`;
    const url = `https://accounts.spotify.com/authorize?response_type=code&client_id=${SPOTIFY_CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(slug ?? "")}`;
    window.location.href = url;
  };

  const handleEmailOnly = async () => {
    if (!email || !campaign) return;
    try {
      await subscribe.mutateAsync({ campaign_id: campaign.id, email, platform: "email_only" });
      toast.success("You're on the list — we'll email you on release day.");
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    }
  };

  const handleAppleReminder = async () => {
    if (!email || !campaign) return;
    try {
      await subscribe.mutateAsync({ campaign_id: campaign.id, email, platform: "apple_music" });
      toast.success("Reminder set — we'll email you and send an Apple Wallet pass.");
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    }
  };

  if (isLoading) return <div className="p-6 text-white/60">Loading…</div>;
  if (!campaign) return <div className="p-6 text-white/60">Campaign not found.</div>;

  const cover = campaign.cover_art_url || track?.cover_art_url;
  const artistName = creator?.display_name || creator?.username || "Artist";

  return (
    <div className="mobile-safe-content max-w-xl mx-auto p-4 space-y-6">
      <header className="text-center">
        {cover && (
          <img src={cover} alt={track?.title} className="w-full max-w-xs mx-auto aspect-square object-cover rounded-2xl" />
        )}
        <h1 className="text-2xl font-bold text-white mt-4">{track?.title ?? "Loading…"}</h1>
        <p className="text-white/60">{artistName}</p>
        {!released && (
          <p className="text-primary font-semibold mt-2">{countdown}</p>
        )}
        {campaign.description && (
          <p className="text-sm text-white/70 mt-3 whitespace-pre-line">{campaign.description}</p>
        )}
      </header>

      {released ? (
        track?.id && <UniversalLinksList trackId={track.id} />
      ) : (
        <Card className="p-4 bg-white/[0.03] border-white/10 space-y-4">
          <div>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {showSpotify && (
            <div className="space-y-1">
              <Button onClick={startSpotifyOAuth} className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black">
                Pre-save on Spotify
              </Button>
              <p className="text-xs text-white/50">
                We'll automatically add this to your Spotify library when it drops. Requires a Spotify account.
              </p>
            </div>
          )}

          {showApple && (
            <div className="space-y-1">
              <Button onClick={handleAppleReminder} variant="outline" className="w-full">
                <Bell className="h-4 w-4 mr-2" /> Get reminder
              </Button>
              <p className="text-xs text-white/50">
                We'll email you when this drops on Apple Music and send an Apple Wallet pass that updates on release day.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Button onClick={handleEmailOnly} variant="ghost" className="w-full">
              <Mail className="h-4 w-4 mr-2" /> Notify me when it drops
            </Button>
          </div>
        </Card>
      )}

      <p className="text-center text-xs text-white/50">{count} fan{count === 1 ? "" : "s"} pre-saved</p>

      {otherTracks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-white font-semibold">More from {artistName}</h2>
          <div className="grid grid-cols-3 gap-2">
            {otherTracks.map((t) => (
              <a key={t.id} href={`/music/track/${t.id}`} className="block">
                {t.cover_art_url && (
                  <img src={t.cover_art_url} alt={t.title} className="w-full aspect-square object-cover rounded-lg" />
                )}
                <p className="text-xs text-white/80 mt-1 truncate">{t.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
