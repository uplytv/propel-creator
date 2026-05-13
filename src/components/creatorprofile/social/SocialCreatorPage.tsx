import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Gift, Radio } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import { useInviteCodes } from "@/hooks/useInviteCodes";
import { usePageMeta } from "@/features/music/components/ArtistPage/usePageMeta";
import { getSiteUrl } from "@/lib/siteUrl";
import { buildProfileShareUrl } from "@/lib/shareUrls";
import { trackEvent } from "@/lib/posthog";
import { getProfileHandleCandidates, normalizeProfileSlugInput } from "@/lib/profileSlug";
import { shouldAcceptRealtime } from "@/lib/optimisticRegistry";
import CoverHeader from "./CoverHeader";
import IdentityRow from "./IdentityRow";
import StatsStrip from "./StatsStrip";
import BioBlock from "./BioBlock";
import HighlightsRow from "./HighlightsRow";
import PinnedGrid from "./PinnedGrid";
import StickyTabs, { TabItem } from "./StickyTabs";
import LinksShelf from "./LinksShelf";
import InlineEditMenu from "./InlineEditMenu";
import SocialIconsRow from "./SocialIconsRow";
import StickyJoinCTA from "./StickyJoinCTA";
import WeeklyPlansStrip from "../WeeklyPlansStrip";
import UpcomingEventsStrip from "../UpcomingEventsStrip";
import CreatorWorksGrid from "../CreatorWorksGrid";
import EpisodeFeed from "../EpisodeFeed";
import CreatorShopTab from "./CreatorShopTab";

const ArtistPageContent = lazy(
  () => import("@/features/music/components/ArtistPage/ArtistPageContent"),
);

const sb = supabase as unknown as any;

const LAYOUT_LABEL: Record<string, string> = {
  musician: "Musician",
  visual_artist: "Visual artist",
  content_creator: "Creator",
  filmmaker: "Filmmaker",
  podcaster: "Podcaster",
  dj_producer: "DJ / Producer",
  generic: "Creator",
};

interface BasicProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  travel_city?: string | null;
  location_label?: string | null;
  creator_type: string | null;
  creator_layout: string | null;
  members?: number | null;
}

interface ArtistProfileLite {
  user_id: string;
  vanity_slug?: string | null;
  header_image_url?: string | null;
  hero_image_url?: string | null;
  hero_logo_url?: string | null;
  tagline?: string | null;
  artist_bio?: string | null;
  is_verified?: boolean | null;
  monthly_listeners_cache?: number | null;
  social_links?: Record<string, string> | null;
  page_published?: boolean | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_og_image?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  [k: string]: any;
}

export default function SocialCreatorPage() {
  const { slug: rawSlug, username: rawUsername } = useParams<{ slug?: string; username?: string }>();
  // Defensive: strip any leading "@" so /@@handle resolves the same as /@handle.
  const slug = normalizeProfileSlugInput(rawSlug || rawUsername);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, follow, unfollow } = useFollows();
  const [tab, setTab] = useState("posts");
  const queryClient = useQueryClient();

  const handleShare = async () => {
    const url = buildProfileShareUrl(canonicalSlug, "web_share");
    const title = `${displayName} (@${canonicalSlug}) on UPLY`;
    // Try Web Share first; fall through to clipboard if unavailable, blocked
    // (e.g. inside a preview iframe), or rejected by the user agent.
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, url });
        trackEvent("profile_shared", { medium: "web_share", slug: canonicalSlug, method: "native_share" });
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        trackEvent("profile_shared", { medium: "web_share", slug: canonicalSlug, method: "cancelled" });
        return; // user cancelled
      }
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      trackEvent("profile_shared", { medium: "web_share", slug: canonicalSlug, method: "clipboard" });
      toast.success("Link copied");
    } catch {
      // Final fallback: hidden textarea + execCommand
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        trackEvent("profile_shared", { medium: "web_share", slug: canonicalSlug, method: "clipboard_fallback" });
        toast.success("Link copied");
      } catch {
        trackEvent("profile_shared", { medium: "web_share", slug: canonicalSlug, method: "failed" });
        toast.error("Could not copy link");
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["social-creator", slug],
    enabled: !!slug,
    queryFn: async () => {
      // Try artist_profiles by vanity_slug first. Profile rows are private via
      // RLS, so public pages must resolve only safe fields through RPC helpers.
      const candidates = getProfileHandleCandidates(slug);
      const artistResults = await Promise.all(
        candidates.map((candidate) =>
          sb
            .from("artist_profiles")
            .select("*")
            .eq("vanity_slug", candidate)
            .maybeSingle()
        )
      );
      const ap = artistResults.find(({ data }) => data)?.data;
      let basic: BasicProfile | null = null;
      if (ap) {
        const { data: b } = await sb
          .rpc("get_public_profile_by_user_id", { _user_id: ap.user_id })
          .maybeSingle();
        basic = b as BasicProfile | null;
      } else {
        const basicResults = await Promise.all(
          candidates.map((candidate) =>
            sb
              .rpc("get_public_profile_by_username", { _username: candidate })
              .maybeSingle()
          )
        );
        const b = basicResults.find(({ data }) => data)?.data;
        basic = b as BasicProfile | null;
        if (basic) {
          const { data: ap2 } = await sb
            .from("artist_profiles")
            .select("*")
            .eq("user_id", basic.user_id)
            .maybeSingle();
          return { artist: ap2 as ArtistProfileLite | null, basic };
        }
      }
      return { artist: ap as ArtistProfileLite | null, basic };
    },
  });

  const artist = data?.artist || null;
  const basic = data?.basic || null;
  const userId = basic?.user_id;
  const profileId = basic?.id;
  const layout = (basic?.creator_layout || (artist ? "musician" : "generic")) as string;

  // Counts: lazy queries for stats
  const { data: counts = { followers: 0, plays: 0, works: 0 } } = useQuery({
    queryKey: ["creator-counts", userId, profileId],
    enabled: !!userId && !!profileId,
    queryFn: async () => {
      const [followers, works] = await Promise.all([
        sb.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
        sb.from("creator_works").select("*", { count: "exact", head: true }).eq("creator_id", profileId),
      ]);
      return {
        followers: followers.count || 0,
        plays: artist?.monthly_listeners_cache || 0,
        works: works.count || 0,
      };
    },
    staleTime: 60_000,
  });

  // Active subscription tier (cheapest active) for Subscribe price label.
  const { data: tier } = useQuery({
    queryKey: ["creator-cheapest-tier", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await sb
        .from("subscription_tiers")
        .select("price_monthly,name")
        .eq("creator_id", userId)
        .eq("is_active", true)
        .order("price_monthly", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  // Live status — drives LIVE pill + sticky CTA marker
  const { data: liveStream } = useQuery({
    queryKey: ["creator-live-status", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Truly active = status active, not ended, AND a recent heartbeat
      // (Mux webhooks bump updated_at). Prevents stale "active" rows
      // from rendering the LIVE badge / live shopping CTA.
      const freshSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await sb
        .from("mux_live_streams_public")
        .select("id,title,viewer_count,mux_playback_id,user_id,featured_product_id,updated_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .is("ended_at", null)
        .gte("updated_at", freshSince)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 0,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  // Also poll shop products so featured live product flips off quickly
  // (realtime subscription handles instant flips; polling is a safety net)

  // Total classroom lessons for KPI strip
  const { data: lessonsCount = 0 } = useQuery({
    queryKey: ["creator-lessons-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await sb
        .from("classroom_lessons")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", userId);
      return count || 0;
    },
    staleTime: 60_000,
  });

  const isOwner = !!user && !!userId && user.id === userId;
  const { data: inviteData } = useInviteCodes();
  const remainingInvites = isOwner ? inviteData?.remaining ?? 0 : 0;
  const displayName = basic?.display_name || basic?.username || "Creator";
  const isLive = !!liveStream;

  // Realtime: flip the LIVE badge / shopping CTA / product list the moment
  // Mux webhooks update the stream row or the creator changes a product.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`creator-live-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mux_live_streams", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const row = payload?.new || payload?.old;
          // Skip echoes of our own optimistic edits while pending.
          if (row?.id && !shouldAcceptRealtime("mux_live_streams", row.id, row)) return;
          queryClient.invalidateQueries({ queryKey: ["creator-live-status", userId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const row = payload?.new || payload?.old;
          if (row?.id && !shouldAcceptRealtime("products", row.id, row)) return;
          queryClient.invalidateQueries({ queryKey: ["creator-shop-products", userId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // SEO + JSON-LD (Person + optional MusicGroup if musician)
  const canonicalSlug = artist?.vanity_slug || basic?.username || slug;
  const canonicalUrl = `${getSiteUrl()}/@${canonicalSlug}`;
  const ogImage =
    artist?.seo_og_image ||
    artist?.header_image_url ||
    basic?.cover_image_url ||
    artist?.hero_image_url ||
    basic?.avatar_url ||
    null;
  const desc =
    artist?.seo_description || artist?.tagline || basic?.bio || `${displayName} on UPLY`;
  const sameAs = useMemo(() => {
    const social = (artist?.social_links || {}) as Record<string, string>;
    return Object.values(social).filter(Boolean);
  }, [artist?.social_links]);
  const personLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": layout === "musician" ? "MusicGroup" : "Person",
    name: displayName,
    url: canonicalUrl,
    image: ogImage || undefined,
    description: desc || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
  usePageMeta({
    title: artist?.seo_title || `${displayName} | UPLY`,
    description: desc,
    ogImage,
    url: canonicalUrl,
    jsonLd: personLd,
  });

  // Loading / 404
  if (isLoading) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }
  if (!basic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
        <h1 className="text-3xl font-heading font-bold mb-3">Not found</h1>
        <p className="opacity-70 mb-6">
          No creator with the handle <span className="font-mono">@{slug}</span>
        </p>
        <Link
          to="/discover"
          className="px-5 py-3 rounded-full font-semibold border border-border hover:bg-muted transition min-h-[44px] inline-flex items-center"
        >
          Discover creators
        </Link>
      </div>
    );
  }

  // Tabs
  const baseTabs: TabItem[] = [
    { id: "posts", label: "Posts" },
    { id: layout === "musician" ? "music" : "work", label: layout === "musician" ? "Music" : "Work" },
    { id: "shop", label: "Shop" },
    { id: "events", label: "Events" },
    { id: "links", label: "Links" },
  ];

  const handleFollowClick = async () => {
    if (!user || !userId) return;
    if (isFollowing(userId)) await unfollow(userId);
    else await follow(userId);
  };

  const subscribePriceLabel = tier?.price_monthly
    ? `$${Number(tier.price_monthly).toFixed(0)}/mo`
    : null;

  return (
    <main className="relative min-h-screen bg-background text-foreground pb-24">
      {/* Floating top actions over cover (back only — share lives inline next to the name) */}
      <div className="absolute top-3 left-3 z-30">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back to UPLY"
          className="h-11 w-11 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <CoverHeader
        manualCoverUrl={artist?.header_image_url || basic.cover_image_url}
        creatorUserId={userId}
        avatarUrl={basic.avatar_url}
        displayName={displayName}
        isOwner={isOwner}
      />

      {/* Owner-only floating compose FAB — opens the unified camera/create flow */}
      {isOwner && (
        <Link
          to="/camera?mode=POST"
          aria-label="Create new post, story, short, video or live"
          className="fixed z-40 bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition"
        >
          <Plus className="h-5 w-5" />
        </Link>
      )}

      <IdentityRow
        displayName={displayName}
        username={basic.username}
        isVerified={!!artist?.is_verified}
        location={basic.location_label || basic.travel_city}
        layoutLabel={LAYOUT_LABEL[layout] || null}
        isOwner={isOwner}
        hasSubscribe={!!tier}
        subscribePriceLabel={subscribePriceLabel}
        onFollow={handleFollowClick}
        isFollowing={!!userId && isFollowing(userId)}
        messageHref={user && !isOwner ? `/messages?to=${userId}` : undefined}
        onShare={handleShare}
        onSubscribe={() => {
          window.location.href = `/community/${userId}`;
        }}
      />

      {/* LIVE NOW pill — quick scroll to live section below */}
      {isLive && (
        <div className="flex justify-center mt-2 px-4">
          <a
            href="#live-section"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-bold text-white animate-pulse"
            style={{ background: "hsl(var(--destructive))", boxShadow: "0 0 18px rgba(255,59,59,0.35)" }}
          >
            <span className="w-2 h-2 rounded-full bg-white" /> LIVE NOW · Tap to watch
          </a>
        </div>
      )}

      {/* Owner-only beta invites card */}
      {isOwner && remainingInvites > 0 && (
        <div className="mt-4 max-w-[560px] mx-auto px-4">
          <button
            onClick={() => navigate("/invite-codes")}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {remainingInvites} beta invite{remainingInvites !== 1 ? "s" : ""} to give
              </p>
              <p className="text-xs text-muted-foreground">
                Share with creators you want on UPLY — they skip the entire waitlist
              </p>
            </div>
            <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform shrink-0">
              Share →
            </span>
          </button>
        </div>
      )}

      <StatsStrip
        stats={[
          { label: "Members", value: basic.members || 0, href: `/community/${userId}` },
          { label: "Followers", value: counts.followers },
          { label: "Lessons", value: lessonsCount, href: `/community/${userId}` },
          { label: "Plays", value: counts.plays },
        ]}
      />

      <BioBlock
        bio={basic.bio || artist?.artist_bio || artist?.tagline || null}
        ctaLabel={artist?.cta_label || null}
        ctaUrl={artist?.cta_url || null}
      />

      {userId && <SocialIconsRow userId={userId} />}

      {/* LIVE NOW player section — anchor target for the LIVE pill above */}
      {isLive && liveStream?.mux_playback_id && (
        <section id="live-section" className="max-w-[720px] mx-auto px-4 mt-6">
          <div
            className="rounded-xl p-3"
            style={{ background: "hsl(var(--card))", border: "2px solid #FF3B3B", boxShadow: "0 0 20px rgba(255,59,59,0.15)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white animate-pulse"
                style={{ background: "hsl(var(--destructive))" }}
              >
                <Radio className="w-3 h-3" /> LIVE NOW
              </span>
              <span className="text-foreground text-sm font-semibold flex-1 truncate">
                {liveStream.title || "Untitled stream"}
              </span>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                {liveStream.viewer_count || 0} watching
              </span>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://stream.mux.com/${liveStream.mux_playback_id}/stream.html`}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                title={liveStream.title || "Live stream"}
              />
            </div>
          </div>
        </section>
      )}

      <HighlightsRow creatorUserId={userId!} />

      <InlineEditMenu
        ownerMode={isOwner}
        userId={userId}
        initial={{
          header_image_url: artist?.header_image_url,
          artist_bio: artist?.artist_bio,
          tagline: artist?.tagline,
          cta_label: artist?.cta_label,
          cta_url: artist?.cta_url,
        }}
      />

      <PinnedGrid creatorProfileId={profileId!} />

      <div className="mt-6">
        <StickyTabs tabs={baseTabs} active={tab} onChange={setTab} />
      </div>

      {tab === "posts" && (
        <>
          <WeeklyPlansStrip creatorUserId={userId!} />
          <CreatorWorksGrid
            creatorProfileId={profileId!}
            workTypes={["video", "photo", "artwork", "other"]}
            title="Recent"
            layout="grid"
            emptyMessage="No posts yet."
          />
        </>
      )}

      {tab === "music" && layout === "musician" && artist && (
        <Suspense fallback={null}>
          <ArtistPageContent
            userId={artist.user_id}
            profile={artist}
            basicProfile={basic}
            mode="public"
          />
        </Suspense>
      )}

      {tab === "work" && (
        <>
          {layout === "podcaster" ? (
            <EpisodeFeed creatorUserId={userId!} />
          ) : (
            <CreatorWorksGrid
              creatorProfileId={profileId!}
              workTypes={["artwork", "video", "film", "episode", "mix", "photo", "other"]}
              title="Work"
              layout={layout === "filmmaker" || layout === "content_creator" ? "feed" : "grid"}
              emptyMessage="No work yet."
            />
          )}
        </>
      )}

      {tab === "shop" && userId && (
        <CreatorShopTab
          creatorUserId={userId}
          liveStreamId={(liveStream as any)?.id || null}
          liveFeaturedProductId={(liveStream as any)?.featured_product_id || null}
        />
      )}

      {tab === "events" && (
        <>
          <UpcomingEventsStrip creatorUserId={userId!} />
          <WeeklyPlansStrip creatorUserId={userId!} />
        </>
      )}

      {tab === "links" && <LinksShelf profileId={profileId!} />}
      {/* Sticky bottom Join Community CTA for non-owners */}
      {!isOwner && userId && (
        <StickyJoinCTA
          creatorUserId={userId}
          creatorName={displayName}
          avatarUrl={basic.avatar_url}
          isLive={isLive}
        />
      )}
    </main>
  );
}
