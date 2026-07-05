import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Music2, Apple, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * DSP Connections — connect your Spotify and Apple Music accounts so we can
 * display "Listen anywhere" links, keep DSP delivery status fresh, and
 * (where allowed) play tracks via the official SDKs.
 *
 * Real OAuth requires platform credentials. Until they're configured, the
 * connect buttons surface clear setup instructions instead of silent failure.
 */

type ProviderStatus = {
  connected: boolean;
  externalUserId?: string | null;
  error?: string | null;
};

const SPOTIFY_CLIENT_ID = (import.meta as any).env?.VITE_SPOTIFY_CLIENT_ID as string | undefined;
const APPLE_DEVELOPER_TOKEN = (import.meta as any).env?.VITE_APPLE_MUSIC_DEVELOPER_TOKEN as
  | string
  | undefined;

export default function DSPConnectionsPage() {
  const { user } = useAuth();
  const [spotify, setSpotify] = useState<ProviderStatus>({ connected: false });
  const [apple, setApple] = useState<ProviderStatus>({ connected: false });
  const [busy, setBusy] = useState<string | null>(null);

  // Read existing connections
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("dsp_connections")
        .select("provider,external_user_id")
        .eq("user_id", user.id);
      const sp = data?.find((d) => d.provider === "spotify");
      const ap = data?.find((d) => d.provider === "apple_music");
      if (sp) setSpotify({ connected: true, externalUserId: sp.external_user_id });
      if (ap) setApple({ connected: true, externalUserId: ap.external_user_id });
    })();
  }, [user]);

  const connectSpotify = () => {
    setBusy("spotify");
    if (!SPOTIFY_CLIENT_ID) {
      setSpotify({
        connected: false,
        error:
          "Spotify is not configured yet. Add VITE_SPOTIFY_CLIENT_ID and a backend token-exchange function to enable real login.",
      });
      setBusy(null);
      return;
    }
    const redirect = `${window.location.origin}/music/connections/spotify/callback`;
    const scopes = [
      "user-read-email",
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
      "streaming",
    ].join(" ");
    const url = new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("client_id", SPOTIFY_CLIENT_ID);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", scopes);
    window.location.href = url.toString();
  };

  const connectApple = async () => {
    setBusy("apple");
    if (!APPLE_DEVELOPER_TOKEN) {
      setApple({
        connected: false,
        error:
          "Apple Music is not configured yet. Add VITE_APPLE_MUSIC_DEVELOPER_TOKEN (a signed JWT from your Apple Developer account) to enable MusicKit login.",
      });
      setBusy(null);
      return;
    }
    try {
      // Lazy-load MusicKit JS
      if (!(window as any).MusicKit) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("MusicKit failed to load"));
          document.head.appendChild(s);
        });
      }
      const MusicKit = (window as any).MusicKit;
      await MusicKit.configure({
        developerToken: APPLE_DEVELOPER_TOKEN,
        app: { name: "UPLY", build: "1.0.0" },
      });
      const music = MusicKit.getInstance();
      const userToken = await music.authorize();
      await supabase.from("dsp_connections").upsert({
        user_id: user!.id,
        provider: "apple_music",
        access_token: userToken,
        external_user_id: userToken?.slice(0, 16) ?? null,
      });
      setApple({ connected: true });
    } catch (e: any) {
      setApple({ connected: false, error: e?.message ?? "Apple Music sign-in failed" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-32">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <Link to="/music/labs" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Music Labs
        </Link>
        <h1 className="text-3xl font-black mb-2">DSP Connections</h1>
        <p className="text-white/60 text-sm mb-8">
          Connect Spotify and Apple Music to enable real playback, "Listen anywhere" universal links, and live delivery status.
        </p>

        <ProviderCard
          icon={<Music2 className="w-5 h-5" />}
          name="Spotify"
          status={spotify}
          busy={busy === "spotify"}
          onConnect={connectSpotify}
        />
        <ProviderCard
          icon={<Apple className="w-5 h-5" />}
          name="Apple Music"
          status={apple}
          busy={busy === "apple"}
          onConnect={connectApple}
        />
      </div>
    </div>
  );
}

function ProviderCard({
  icon,
  name,
  status,
  busy,
  onConnect,
}: {
  icon: React.ReactNode;
  name: string;
  status: ProviderStatus;
  busy: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 mb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
          <div>
            <div className="font-bold">{name}</div>
            <div className="text-xs text-white/50">
              {status.connected ? "Connected" : "Not connected"}
            </div>
          </div>
        </div>
        {status.connected ? (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <CheckCircle2 className="w-4 h-4" /> Linked
          </span>
        ) : (
          <button
            onClick={onConnect}
            disabled={busy}
            className="px-4 py-2 rounded-full text-sm font-bold bg-primary text-black disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
        )}
      </div>
      {status.error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{status.error}</span>
        </div>
      )}
    </div>
  );
}
