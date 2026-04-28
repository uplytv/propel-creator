import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, ExternalLink, Calendar, Headphones, ShoppingBag, Sparkles, Lock, Gift, Copy } from "lucide-react";
import { buildSpotifyAuthUrl, buildSpotifyFollowUrl } from "@/lib/spotifyConfig";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

interface SmartLink {
  id: string;
  slug: string;
  link_type: string;
  title: string;
  artist: string | null;
  description: string | null;
  cover_image_url: string | null;
  platforms: Record<string, string>;
  release_date: string | null;
  is_presave: boolean;
  presave_converted: boolean;
  capture_email: boolean;
  theme: Record<string, any>;
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  spotify: { label: "Spotify", color: "bg-[#1DB954] hover:bg-[#1ed760]" },
  apple_music: { label: "Apple Music", color: "bg-[#FA243C] hover:bg-[#ff3a52]" },
  youtube: { label: "YouTube", color: "bg-[#FF0000] hover:bg-[#ff2424]" },
  youtube_music: { label: "YouTube Music", color: "bg-[#FF0000] hover:bg-[#ff2424]" },
  tidal: { label: "Tidal", color: "bg-black hover:bg-neutral-800" },
  amazon_music: { label: "Amazon Music", color: "bg-[#00A8E1] hover:bg-[#1ab8ed]" },
  soundcloud: { label: "SoundCloud", color: "bg-[#FF5500] hover:bg-[#ff6a1f]" },
  deezer: { label: "Deezer", color: "bg-[#A238FF] hover:bg-[#b352ff]" },
  bandcamp: { label: "Bandcamp", color: "bg-[#629AA9] hover:bg-[#71abba]" },
};

export default function SmartLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [link, setLink] = useState<SmartLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [presaving, setPresaving] = useState(false);
  const [presaveCount, setPresaveCount] = useState(0);
  const viewTrackedRef = useRef(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("smart_links")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      setLink(data as unknown as SmartLink);
      setLoading(false);
      // Log a single page-view via the edge function (captures country + dedupes).
      // Ref guard prevents StrictMode double-invocation in dev.
      if (!viewTrackedRef.current) {
        viewTrackedRef.current = true;
        supabase.functions
          .invoke("smartlink-track-click", {
            body: {
              link_id: (data as any).id,
              platform: "view",
              referrer: document.referrer || null,
            },
          })
          .then(() => {}, () => {});
      }
      // Social proof: count of pre-saves for this link (only meaningful while pre-save is active)
      if ((data as any).is_presave) {
        supabase
          .from("smart_link_presaves")
          .select("*", { head: true, count: "exact" })
          .eq("link_id", (data as any).id)
          .then(({ count }) => {
            if (!cancelled) setPresaveCount(count || 0);
          }, () => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const fireCapi = (eventName: string, platform?: string) => {
    if (!link) return;
    // Fire-and-forget server-side Meta CAPI event
    supabase.functions
      .invoke("smartlink-meta-capi", {
        body: {
          link_id: link.id,
          event_name: eventName,
          platform: platform || null,
          email: emailInput || null,
          event_source_url: window.location.href,
          user_agent: navigator.userAgent,
        },
      })
      .then(() => {}, () => {});
  };

  const trackClick = async (platform: string) => {
    if (!link) return;
    // Server-side click logger captures country and dedupes per IP.
    supabase.functions
      .invoke("smartlink-track-click", {
        body: {
          link_id: link.id,
          platform,
          referrer: document.referrer || null,
        },
      })
      .then(() => {}, () => {});
    fireCapi("SmartLinkClick", platform);
  };

  const handlePlatformClick = (platform: string, url: string) => {
    trackClick(platform);
    if (link?.capture_email && emailInput) {
      supabase
        .from("smart_link_email_captures")
        .insert({ link_id: link.id, email: emailInput, source: platform })
        .then(() => {}, () => {});
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePresave = async () => {
    if (!link) return;
    if (link.capture_email && !emailInput) {
      toast.error("Please enter your email first");
      return;
    }
    setPresaving(true);
    try {
      fireCapi("SmartLinkPresave", "spotify");
      const url = buildSpotifyAuthUrl(link.slug, emailInput || undefined);
      window.location.href = url;
    } finally {
      setPresaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Music className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Link not found</h1>
        <p className="text-muted-foreground">This SmartLink may have been removed.</p>
        <Button className="mt-6" onClick={() => navigate("/")}>Go home</Button>
      </div>
    );
  }

  const TypeIcon =
    link.link_type === "event" ? Calendar :
    link.link_type === "podcast" ? Headphones :
    link.link_type === "product" ? ShoppingBag : Music;

  const showPresave = link.is_presave && !link.presave_converted;
  const platformEntries = Object.entries(link.platforms || {}).filter(([, url]) => !!url);

  return (
    <>
      <SEOHead
        title={`${link.title}${link.artist ? ` — ${link.artist}` : ""} | UPLY`}
        description={link.description || `Listen to ${link.title} on every major platform.`}
        image={link.cover_image_url || undefined}
        type={link.link_type === "music" ? "music.song" : "website"}
      />
      <div
        className="min-h-screen flex items-center justify-center p-4 mobile-safe-content relative overflow-hidden"
        style={{
          background: link.cover_image_url
            ? `url(${link.cover_image_url}) center/cover no-repeat`
            : undefined,
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/85 backdrop-blur-2xl" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl">
            {/* Cover */}
            <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-5 flex items-center justify-center">
              {link.cover_image_url ? (
                <img
                  src={link.cover_image_url}
                  alt={link.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <TypeIcon className="h-20 w-20 text-muted-foreground" />
              )}
            </div>

            {/* Title */}
            <div className="text-center mb-5">
              {link.artist && (
                <p className="text-sm text-muted-foreground uppercase tracking-wider">{link.artist}</p>
              )}
              <h1 className="text-2xl font-bold mt-1">{link.title}</h1>
              {link.description && (
                <p className="text-sm text-muted-foreground mt-2">{link.description}</p>
              )}
              {showPresave && link.release_date && (
                <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Out {new Date(link.release_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>

            {/* Email capture */}
            {link.capture_email && (
              <Input
                type="email"
                placeholder="your@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="mb-3 text-base"
                style={{ fontSize: "16px" }}
              />
            )}

            {/* Buttons */}
            <div className="space-y-2">
              {showPresave && presaveCount > 0 && (
                <p className="text-center text-xs text-muted-foreground pb-1">
                  🎵 <span className="text-foreground font-semibold">{presaveCount.toLocaleString()}</span>{" "}
                  fan{presaveCount === 1 ? "" : "s"} already pre-saved this
                </p>
              )}
              {showPresave && link.platforms.spotify && (
                <Button
                  onClick={handlePresave}
                  disabled={presaving}
                  className="w-full h-12 bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Pre-save on Spotify
                </Button>
              )}

              {platformEntries.map(([platform, url]) => {
                const meta = PLATFORM_META[platform] || { label: platform, color: "bg-secondary hover:bg-secondary/80" };
                if (showPresave && platform === "spotify") return null;
                return (
                  <Button
                    key={platform}
                    onClick={() => handlePlatformClick(platform, url)}
                    className={`w-full h-12 text-white font-semibold ${meta.color}`}
                  >
                    {meta.label}
                    <ExternalLink className="h-4 w-4 ml-auto opacity-70" />
                  </Button>
                );
              })}

              {platformEntries.length === 0 && !showPresave && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No platforms configured yet.
                </p>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Powered by <a href="/" className="font-semibold hover:text-foreground">UPLY SmartLinks</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
