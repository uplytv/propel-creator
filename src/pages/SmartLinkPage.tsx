import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Music, ExternalLink, Calendar, Headphones, ShoppingBag, Sparkles, Copy, Gift, Share2, Lock, Check } from "lucide-react";
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
  unlock_type?: "none" | "spotify_follow" | "email" | "social_share" | null;
  unlock_spotify_artist_id?: string | null;
  unlock_reward_type?: "download" | "content" | "discount" | null;
  unlock_reward_url?: string | null;
  unlock_reward_label?: string | null;
  contest_enabled?: boolean;
  contest_prize?: string | null;
  contest_end_date?: string | null;
  itunes_affiliate_token?: string | null;
  amazon_affiliate_tag?: string | null;
  tiktok_sound_url?: string | null;
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

  // Apple Music presave
  const [applePresaving, setApplePresaving] = useState(false);
  const appleTokenConfigured = !!import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN;

  // Social unlock
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const referralCodeParam =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("ref")
      : null;

  // Contest entry
  const [contestEntered, setContestEntered] = useState(false);
  const [contestCode, setContestCode] = useState("");
  const [contestName, setContestName] = useState("");

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
      if (window.location.search.includes("unlocked=1")) {
        setUnlocked(true);
      }
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

  const decorateUrl = (platform: string, url: string): string => {
    try {
      const u = new URL(url);
      if (platform === "apple_music" && link?.itunes_affiliate_token) {
        if (!u.searchParams.has("at")) {
          u.searchParams.set("at", link.itunes_affiliate_token);
        }
      }
      if (platform === "amazon_music" && link?.amazon_affiliate_tag) {
        if (!u.searchParams.has("tag")) {
          u.searchParams.set("tag", link.amazon_affiliate_tag);
        }
      }
      return u.toString();
    } catch {
      return url;
    }
  };

  const handlePlatformClick = (platform: string, url: string) => {
    trackClick(platform);
    if (link?.capture_email && emailInput) {
      supabase
        .from("smart_link_email_captures")
        .insert({ link_id: link.id, email: emailInput, source: platform })
        .then(() => {}, () => {});
    }
    window.open(decorateUrl(platform, url), "_blank", "noopener,noreferrer");
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

  const handleApplePresave = async () => {
    if (!link) return;
    if (link.capture_email && !emailInput) {
      toast.error("Please enter your email first");
      return;
    }
    setApplePresaving(true);
    try {
      if (!window.MusicKit) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load MusicKit"));
          document.head.appendChild(s);
        });
      }
      const music = await window.MusicKit!.configure({
        developerToken: import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN as string,
        app: { name: "UPLY SmartLinks", build: "1.0" },
      });
      const userToken = await music.authorize();
      const { data, error } = await supabase.functions.invoke("apple-presave", {
        body: { link_slug: link.slug, user_token: userToken, fan_email: emailInput || undefined },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      setPresaveCount((c) => c + 1);
      toast.success("Added to Apple Music! 🍎", { description: "We'll notify you when it drops." });
      fireCapi("SmartLinkPresave", "apple_music");
    } catch (err: any) {
      if (err.message?.includes("AUTHORIZATION_ERROR") || err.message?.includes("cancelled")) {
        toast.error("Apple Music authorization cancelled");
      } else {
        toast.error("Apple Music presave failed", { description: err.message });
      }
    } finally {
      setApplePresaving(false);
    }
  };

  const handleUnlock = async () => {
    if (!link) return;
    setUnlocking(true);
    try {
      if (link.unlock_type === "spotify_follow") {
        const url = buildSpotifyFollowUrl(link.slug, emailInput || undefined);
        window.location.href = url;
        return;
      }
      if (link.unlock_type === "email") {
        if (!emailInput) {
          toast.error("Enter your email to unlock");
          setUnlocking(false);
          return;
        }
        await supabase.from("smart_link_unlocks").insert({
          link_id: link.id,
          fan_email: emailInput,
          unlock_type: "email",
        });
        await supabase
          .from("smart_link_email_captures")
          .insert({ link_id: link.id, email: emailInput, source: "unlock_email" })
          .then(() => {}, () => {});
        setUnlocked(true);
        toast.success("Unlocked! 🎉");
      }
      if (link.unlock_type === "social_share") {
        let shared = false;
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({ title: link.title, url: window.location.href });
            shared = true;
          } catch (err: any) {
            // AbortError = user cancelled the share sheet → do NOT unlock
            if (err?.name === "AbortError") {
              shared = false;
            } else {
              shared = false;
            }
          }
        } else {
          // No native share — copy link as a fallback share action
          try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied — paste it anywhere to share!");
            shared = true;
          } catch {
            shared = false;
          }
        }

        if (!shared) {
          toast.error("Share cancelled — share to unlock your reward");
          return;
        }

        await supabase.from("smart_link_unlocks").insert({
          link_id: link.id,
          unlock_type: "social_share",
        });
        setUnlocked(true);
        toast.success("Thanks for sharing! 🎉");
      }
    } finally {
      setUnlocking(false);
    }
  };

  const handleContestEntry = async () => {
    if (!link) return;
    const email = emailInput;
    if (!email) {
      toast.error("Enter your email to enter the contest");
      return;
    }
    const { data, error } = await supabase
      .from("smart_link_contest_entries")
      .insert({
        link_id: link.id,
        fan_email: email,
        fan_name: contestName || null,
        referred_by: referralCodeParam || null,
      })
      .select("referral_code")
      .single();

    if ((error as any)?.code === "23505") {
      toast.error("You've already entered!");
      return;
    }
    if (error) {
      toast.error("Entry failed — please try again");
      return;
    }

    if (referralCodeParam) {
      supabase
        .rpc("increment_referral_count" as any, { p_code: referralCodeParam })
        .then(() => {}, () => {});
    }

    setContestCode((data as any).referral_code);
    setContestEntered(true);
    toast.success("You're in! 🎉 Share your link for more entries.");
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
  const hasUnlock = !!link.unlock_type && link.unlock_type !== "none";

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
        <div className="absolute inset-0 bg-background/85 backdrop-blur-2xl" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-2xl">
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

            <div className="space-y-2">
              {hasUnlock && !unlocked ? (
                <div className="text-center py-6 px-2 space-y-3">
                  <div className="text-5xl">🔒</div>
                  <p className="text-lg font-bold">
                    {link.unlock_type === "spotify_follow" && "Follow on Spotify to unlock"}
                    {link.unlock_type === "email" && "Enter your email to unlock"}
                    {link.unlock_type === "social_share" && "Share this link to unlock"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {link.unlock_reward_label || "Get your exclusive reward"}
                  </p>
                  {link.unlock_type === "email" && (
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="text-base"
                      style={{ fontSize: "16px" }}
                    />
                  )}
                  <Button
                    onClick={handleUnlock}
                    disabled={unlocking}
                    className="w-full h-12 font-semibold"
                  >
                    {unlocking
                      ? "Unlocking..."
                      : link.unlock_type === "spotify_follow"
                      ? "Follow on Spotify →"
                      : link.unlock_type === "social_share"
                      ? "Share to Unlock →"
                      : "Unlock Now →"}
                  </Button>
                </div>
              ) : (
                <>
                  {unlocked && link.unlock_reward_url && (
                    <Button
                      onClick={() =>
                        window.open(link.unlock_reward_url!, "_blank", "noopener,noreferrer")
                      }
                      className="w-full h-12 font-bold mb-1"
                    >
                      🎁 {link.unlock_reward_label || "Get your reward"}
                    </Button>
                  )}

                  {showPresave && presaveCount > 0 && (
                    <p className="text-center text-xs text-muted-foreground pb-1">
                      🎵{" "}
                      <span className="text-foreground font-semibold">
                        {presaveCount.toLocaleString()}
                      </span>{" "}
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
                      {presaving ? "Redirecting..." : "Pre-save on Spotify"}
                    </Button>
                  )}
                  {showPresave &&
                    (appleTokenConfigured ? (
                      <Button
                        onClick={handleApplePresave}
                        disabled={applePresaving}
                        className="w-full h-12 bg-[#FA243C] hover:bg-[#ff3a52] text-white font-semibold"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {applePresaving ? "Connecting to Apple Music..." : "Pre-add on Apple Music"}
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="w-full h-12 bg-[#FA243C]/40 text-white/80 font-semibold cursor-not-allowed"
                      >
                        Apple Music — Coming Soon
                      </Button>
                    ))}

                  {platformEntries.map(([platform, url]) => {
                    const meta =
                      PLATFORM_META[platform] || {
                        label: platform,
                        color: "bg-secondary hover:bg-secondary/80",
                      };
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

                  {link.tiktok_sound_url && (
                    <Button
                      onClick={() => {
                        trackClick("tiktok_sound");
                        window.open(link.tiktok_sound_url!, "_blank", "noopener,noreferrer");
                      }}
                      className="w-full h-12 bg-black hover:bg-neutral-800 text-white font-semibold"
                    >
                      <svg
                        className="h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.5a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.93Z" />
                      </svg>
                      Use This Sound on TikTok
                      <ExternalLink className="h-4 w-4 ml-auto opacity-70" />
                    </Button>
                  )}

                  {platformEntries.length === 0 && !showPresave && !link.tiktok_sound_url && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No platforms configured yet.
                    </p>
                  )}
                </>
              )}
            </div>

            {link.contest_enabled && (
              <div className="mt-6 pt-6 border-t border-border">
                {!contestEntered ? (
                  <div className="space-y-3">
                    <h3 className="text-center font-bold text-lg">
                      🎁 {link.contest_prize || "Enter to win"}
                    </h3>
                    {link.contest_end_date && (
                      <p className="text-center text-xs text-muted-foreground">
                        Ends{" "}
                        {new Date(link.contest_end_date).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                    <Input
                      type="text"
                      placeholder="Your name (optional)"
                      value={contestName}
                      onChange={(e) => setContestName(e.target.value)}
                      style={{ fontSize: "16px" }}
                    />
                    {!link.capture_email && (
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        style={{ fontSize: "16px" }}
                      />
                    )}
                    <Button onClick={handleContestEntry} className="w-full h-12 font-semibold">
                      Enter to Win 🎁
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="font-bold">You're in! Get more entries by sharing:</p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={`${window.location.origin}/link/${link.slug}?ref=${contestCode}`}
                        style={{ fontSize: "16px" }}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/link/${link.slug}?ref=${contestCode}`,
                          );
                          toast.success("Referral link copied!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Each friend who enters via your link = +1 entry for you
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-6">
              Powered by{" "}
              <a href="/" className="font-semibold hover:text-foreground">
                UPLY SmartLinks
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
