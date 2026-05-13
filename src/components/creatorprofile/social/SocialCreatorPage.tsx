import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import { usePageMeta } from "@/features/music/components/ArtistPage/usePageMeta";
import { getSiteUrl } from "@/lib/siteUrl";
import CoverHeader from "./CoverHeader";
import IdentityRow from "./IdentityRow";
import StatsStrip from "./StatsStrip";
import BioBlock from "./BioBlock";
import HighlightsRow from "./HighlightsRow";
import PinnedGrid from "./PinnedGrid";
import StickyTabs, { TabItem } from "./StickyTabs";
import LinksShelf from "./LinksShelf";
import InlineEditMenu from "./InlineEditMenu";
import WeeklyPlansStrip from "../WeeklyPlansStrip";
import UpcomingEventsStrip from "../UpcomingEventsStrip";
import CreatorWorksGrid from "../CreatorWorksGrid";
import EpisodeFeed from "../EpisodeFeed";

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
  const slug = (rawSlug || rawUsername || "").replace(/^@+/, "");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, follow, unfollow } = useFollows();
  const [tab, setTab] = useState("posts");

  const handleShare = async () => {
    const url = `${getSiteUrl()}/@${slug}`;
    const title = `${slug} on UPLY`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {/* user cancelled */}
  };

  const { data, isLoading } = useQuery({
    queryKey: ["social-creator", slug],
    enabled: !!slug,
    queryFn: async () => {
      // Try artist_profiles by vanity_slug first. Profile rows are private via
      // RLS, so public pages must resolve only safe fields through RPC helpers.
      const { data: ap } = await sb
        .from("artist_profiles")
        .select("*")
        .eq("vanity_slug", slug)
        .maybeSingle();
      let basic: BasicProfile | null = null;
      if (ap) {
        const { data: b } = await sb
          .rpc("get_public_profile_by_user_id", { _user_id: ap.user_id })
          .maybeSingle();
        basic = b as BasicProfile | null;
      } else {
        const { data: b } = await sb
          .rpc("get_public_profile_by_username", { _username: slug })
          .maybeSingle();
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

  const isOwner = !!user && !!userId && user.id === userId;
  const displayName = basic?.display_name || basic?.username || "Creator";

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
    <main className="min-h-screen bg-background text-foreground pb-24">
      <CoverHeader
        manualCoverUrl={artist?.header_image_url || basic.cover_image_url}
        creatorUserId={userId}
        avatarUrl={basic.avatar_url}
        displayName={displayName}
      />

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
        onSubscribe={() => {
          window.location.href = `/community/${userId}`;
        }}
      />

      <StatsStrip
        stats={[
          { label: "Members", value: basic.members || 0, href: `/community/${userId}` },
          { label: "Followers", value: counts.followers },
          { label: "Plays", value: counts.plays },
          { label: "Works", value: counts.works },
        ]}
      />

      <BioBlock
        bio={basic.bio || artist?.artist_bio || artist?.tagline || null}
        ctaLabel={artist?.cta_label || null}
        ctaUrl={artist?.cta_url || null}
      />

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

      {tab === "events" && (
        <>
          <UpcomingEventsStrip creatorUserId={userId!} />
          <WeeklyPlansStrip creatorUserId={userId!} />
        </>
      )}

      {tab === "links" && <LinksShelf profileId={profileId!} />}
    </main>
  );
}
