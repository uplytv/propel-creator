import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import LinkEmailGate from "@/components/shared/LinkEmailGate";
import { useApplyBrandTheme } from "@/components/branding/BrandScope";
import { usePaymentReturn, useProductPurchaseCheck, useMemberSubscriptionStatus } from "@/hooks/usePaymentReturn";
import CourseEnrollSheet from "@/components/payments/CourseEnrollSheet";
import { PurchaseOverlay } from "@/components/payments/PurchaseOverlay";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import QueryErrorState from "@/components/ui/QueryErrorState";
import {
  Heart, MessageCircle, Lock, Play, ChevronDown, ChevronUp,
  ExternalLink, Users, BookOpen, FileText, Pencil, ShoppingBag, Loader2 as BuyLoader, Gift
} from "lucide-react";
import CreatorProfileEditDrawer from "@/components/creator-profile/CreatorProfileEditDrawer";
import CreatorMilestones from "@/components/creator-profile/CreatorMilestones";
import CreatorTestimonials from "@/components/creator-profile/CreatorTestimonials";
import SEOHead, { buildPersonSchema } from "@/components/SEOHead";
import PaymentProcessingOverlay from "@/components/PaymentProcessingOverlay";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { useInviteCodes } from "@/hooks/useInviteCodes";
import { fireMetaEvent, fireGoogleEvent } from "@/lib/adTracking";
import AddFriendButton from "@/components/social/AddFriendButton";
import CreatorMusicSection from "@/features/music/components/CreatorMusicSection";

// Social platform icons as simple SVG components
const socialIcons: Record<string, React.FC<{ className?: string }>> = {
  instagram: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
  ),
  tiktok: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.15a8.16 8.16 0 005.58 2.18v-3.45a4.85 4.85 0 01-3.77-1.81V6.69h3.77z"/></svg>
  ),
  youtube: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  ),
  twitter: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  ),
  linkedin: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  ),
  podcast: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a9 9 0 00-3.83 17.15V22a1 1 0 001 1h5.66a1 1 0 001-1v-3.85A9 9 0 0012 1zm2.83 15.23l-.83.39V21h-4v-4.38l-.83-.39A7 7 0 1114.83 16.23zM12 7a3 3 0 100 6 3 3 0 000-6z"/></svg>
  ),
  newsletter: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
  ),
};

function useCreatorProfileData(username: string | undefined) {
  const profileQuery = useQuery({
    queryKey: ["creator-public-profile", username],
    queryFn: async () => {
      // Try username first, then display_name as fallback
      let { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, user_id, display_name, username, avatar_url, bio, creator_type, members, mrr, total_revenue, cover_image_url, business_category, website")
        .eq("username", username)
        .maybeSingle();
      if (!data) {
        const res = await (supabase as any)
          .from("profiles")
          .select("id, user_id, display_name, username, avatar_url, bio, creator_type, members, mrr, total_revenue, cover_image_url, business_category, website")
          .ilike("display_name", username!)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }
      if (error) throw error;
      return data;
    },
    enabled: !!username,
  });

  const userId = profileQuery.data?.user_id;
  // White-label: apply this creator's brand theme to their public profile (Phase 1)
  useApplyBrandTheme(userId);

  const socialLinksQuery = useQuery({
    queryKey: ["creator-social-links", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("social_links")
        .select("*")
        .eq("user_id", userId!);
      return (data as any[]) || [];
    },
    enabled: !!userId,
  });

  const liveStreamQuery = useQuery({
    queryKey: ["creator-live-status", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("mux_live_streams_public")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const memberCountQuery = useQuery({
    queryKey: ["creator-member-count", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", userId!);
      return count || 0;
    },
    enabled: !!userId,
  });

  const postsQuery = useQuery({
    queryKey: ["creator-public-posts", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select("*, profiles:author_id(display_name, avatar_url)")
        .eq("creator_id", userId!)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!userId,
  });

  const modulesQuery = useQuery({
    queryKey: ["creator-public-modules", userId],
    queryFn: async () => {
      const { data: modules } = await supabase
        .from("classroom_modules")
        .select("*")
        .eq("creator_id", userId!)
        .order("position", { ascending: true });
      if (!modules?.length) return [];

      const { data: lessons } = await supabase
        .from("classroom_lessons")
        .select("*")
        .eq("creator_id", userId!)
        .order("position", { ascending: true });

      return modules.map((m: any) => ({
        ...m,
        lessons: (lessons || []).filter((l: any) => l.module_id === m.id),
      }));
    },
    enabled: !!userId,
  });

  const totalLessonsQuery = useQuery({
    queryKey: ["creator-total-lessons", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("classroom_lessons")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", userId!);
      return count || 0;
    },
    enabled: !!userId,
  });

  const isMemberQuery = useQuery({
    queryKey: ["creator-is-member", userId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("community_members")
        .select("id")
        .eq("creator_id", userId!)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!userId,
  });

  const spaceQuery = useQuery({
    queryKey: ["creator-space", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_spaces")
        .select("*")
        .eq("creator_id", userId!)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const tiersQuery = useQuery({
    queryKey: ["creator-tiers", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_tiers")
        .select("*")
        .eq("creator_id", userId!)
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });
      return data || [];
    },
    enabled: !!userId,
  });

  const productsQuery = useQuery({
    queryKey: ["creator-public-products", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, description, type, price, image_url, status")
        .eq("user_id", userId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const smartLinksQuery = useQuery({
    queryKey: ["creator-public-smartlinks", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("smart_links")
        .select("id, slug, title, artist, cover_image_url, is_presave, link_type")
        .eq("creator_id", userId!)
        .order("created_at", { ascending: false })
        .limit(6);
      return (data as any[]) || [];
    },
    enabled: !!userId,
  });

  return {
    profile: profileQuery.data,
    profileLoading: profileQuery.isLoading,
    profileError: profileQuery.isError,
    profileRefetch: profileQuery.refetch,
    socialLinks: socialLinksQuery.data || [],
    liveStream: liveStreamQuery.data,
    memberCount: memberCountQuery.data || 0,
    posts: postsQuery.data || [],
    modules: modulesQuery.data || [],
    totalLessons: totalLessonsQuery.data || 0,
    isMember: isMemberQuery.data || false,
    space: spaceQuery.data,
    tiers: tiersQuery.data || [],
    products: productsQuery.data || [],
    smartLinks: smartLinksQuery.data || [],
  };
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// SEO head injection with JSON-LD
function useCreatorSEO(profile: any) {
  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name || "Creator";
    const bio = profile.bio ? profile.bio.substring(0, 160) : "";
    const avatar = profile.avatar_url || "/logo.png";
    const username = profile.username || profile.display_name || "";
    const url = `https://uply.tv/creator/${username}`;

    document.title = `${name} on UPLY`;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", `${bio}. Join ${name}'s community on UPLY.`);
    setMeta("property", "og:title", `${name} on UPLY`);
    setMeta("property", "og:description", bio);
    setMeta("property", "og:image", avatar);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "profile");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", `${name} on UPLY`);
    setMeta("name", "twitter:description", bio);
    setMeta("name", "twitter:image", avatar);

    // JSON-LD structured data for creator profile
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "mainEntity": {
        "@type": "Person",
        "name": name,
        "description": bio,
        "image": avatar,
        "url": url,
        "sameAs": [],
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://uply.tv" },
          { "@type": "ListItem", "position": 2, "name": "Creators", "item": "https://uply.tv/discover" },
          { "@type": "ListItem", "position": 3, "name": name, "item": url },
        ],
      },
    };

    let script = document.querySelector('#creator-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "creator-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = "UPLY";
      const el = document.querySelector('#creator-jsonld');
      if (el) el.remove();
    };
  }, [profile]);
}




export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [bioExpanded, setBioExpanded] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [buyingProductId, setBuyingProductId] = useState<string | null>(null);
  const [enrollProduct, setEnrollProduct] = useState<any>(null);
  const [purchaseOverlayTier, setPurchaseOverlayTier] = useState<any>(null);

  const {
    profile, profileLoading, profileError, profileRefetch, socialLinks, liveStream,
    memberCount, posts, modules, totalLessons, isMember, space, tiers, products, smartLinks,
  } = useCreatorProfileData(username);

  const { data: inviteData } = useInviteCodes();
  const remainingInvites = inviteData?.remaining ?? 0;

  useCreatorSEO(profile);

  const isOwner = user && profile && user.id === profile.user_id;
  const brand = useApplyBrandTheme(profile?.user_id);
  const isLive = !!liveStream;
  const creatorName = profile?.display_name || "Creator";

  // Email gate for anonymous visitors coming from shared links
  const [emailGateDismissed, setEmailGateDismissed] = useState(false);
  const showEmailGate = !user && !isOwner && profile && !emailGateDismissed && !sessionStorage.getItem(`email_gate_${profile.user_id}`);

  // Subscription status check for button states
  const { data: memberSubStatus } = useMemberSubscriptionStatus(profile?.user_id);

  // Handle mobile return from Stripe
  const { checking: paymentChecking } = usePaymentReturn(profile?.user_id);

  useEffect(() => {
    const handleScroll = () => setShowStickyBar(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleJoin = async () => {
    if (!user) {
      navigate(`/auth?ref=${username}`);
      return;
    }

    const requiresPaidJoin = tiers.length > 0 || space?.is_free === false || Number(space?.price || 0) > 0;

    if (tiers.length > 1) {
      navigate(`/community/${profile?.user_id}/pricing`);
      return;
    }

    if (tiers.length === 1) {
      // Use PurchaseOverlay for seamless in-page checkout
      setPurchaseOverlayTier(tiers[0]);
      return;
    }

    if (requiresPaidJoin) {
      toast.error("This creator hasn't published a live paid tier yet.");
      navigate(`/community/${profile?.user_id}/pricing`);
      return;
    }

    navigate(`/community/${profile?.user_id}/community`);
  };

  const handleBuyProduct = async (productId: string) => {
    if (!user) {
      navigate(`/auth?ref=${username}`);
      return;
    }
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      setEnrollProduct(product);
    }
  };

  // Loading
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ProfileSkeleton />
      </div>
    );
  }

  // Fetch error — a network/Supabase outage, not a missing creator
  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <QueryErrorState
          message="We couldn't load this creator's profile right now. Check your connection and try again."
          onRetry={() => profileRefetch()}
        />
      </div>
    );
  }

  // 404
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">This creator doesn't exist yet.</h1>
          <p className="text-muted-foreground mb-6">The page you're looking for isn't available.</p>
          <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground">
            Start your own UPLY →
          </Link>
        </div>
      </div>
    );
  }

  const postCount = posts.length;

  return (
    <div className="min-h-screen bg-background">
      <PaymentProcessingOverlay show={paymentChecking} />
      {showEmailGate && (
        <LinkEmailGate
          creatorId={profile.user_id}
          creatorName={creatorName}
          source="link"
          onComplete={() => {
            setEmailGateDismissed(true);
            sessionStorage.setItem(`email_gate_${profile.user_id}`, "1");
          }}
        />
      )}
      <SEOHead
        title={profile.display_name || profile.username || "Creator"}
        description={profile.bio || `Check out ${profile.display_name || profile.username}'s community, courses, and live streams on Uply.`}
        image={profile.avatar_url || undefined}
        type="profile"
        jsonLd={buildPersonSchema({
          name: profile.display_name || profile.username || "Creator",
          url: `https://uply.tv/${profile.username || profile.user_id}`,
          image: profile.avatar_url || undefined,
          description: profile.bio || undefined,
        })}
      />
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 backdrop-blur-xl bg-background/85 border-b border-border">
        <Link to="/" className="font-bold text-lg text-foreground tracking-tight flex items-center gap-2">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.brandName || "Brand"} className="h-6 w-auto object-contain" />
          ) : (
            <span>{brand.brandName || "UPLY"}</span>
          )}
        </Link>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-foreground bg-secondary border border-border">
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </button>
              {remainingInvites > 0 && (
                <button
                  onClick={() => navigate("/invite-codes")}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-all"
                  aria-label={`${remainingInvites} beta invites remaining`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>
                    {remainingInvites} Invite{remainingInvites !== 1 ? "s" : ""}
                  </span>
                </button>
              )}
            </div>
          ) : !user ? (
            <>
              <Link to="/auth" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Log In</Link>
              <Link to="/auth" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground">Start Free →</Link>
            </>
          ) : null}
        </div>
      </nav>

      {/* PROFILE HEADER */}
      <section className="relative">
        {/* Cover */}
        <div className="h-44 w-full relative overflow-hidden">
          {profile.cover_image_url ? (
            <img src={profile.cover_image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-card to-background" />
          )}
          {/* Green glow behind avatar */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(61, 124, 255,0.05) 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-[720px] mx-auto px-4 -mt-12 relative z-10">
          {/* Avatar */}
          <div className="flex justify-center relative">
            <div className="relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={creatorName} loading="lazy" className="w-24 h-24 rounded-full object-cover border-[3px] border-primary" />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-[3px] border-primary bg-secondary text-primary">
                  {creatorName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* LIVE badge on avatar */}
              {isLive && (
                <button
                  onClick={() => document.getElementById("live-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-bold animate-pulse"
                  style={{ background: "hsl(var(--destructive))" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                </button>
              )}
            </div>
          </div>

          {/* Name + username */}
          <div className="text-center mt-4">
            <h1 className="text-[28px] font-extrabold text-foreground">{creatorName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">@{profile.username || profile.display_name || username}</p>
          </div>

          {/* Type pill */}
          {profile.creator_type && (
            <div className="flex justify-center mt-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-primary">
                {profile.creator_type}{profile.business_category ? ` · ${profile.business_category}` : ""}
              </span>
            </div>
          )}

          {/* Beta invite banner for owner */}
          {isOwner && remainingInvites > 0 && (
            <div className="mt-4 max-w-[560px] mx-auto">
              <button
                onClick={() => navigate("/invite-codes")}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-primary/25 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {remainingInvites} beta invite{remainingInvites !== 1 ? "s" : ""} to give
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Share with creators you want on UPLY — they skip the entire waitlist
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                  Share →
                </span>
              </button>
            </div>
          )}
          {/* Bio */}
          {profile.bio && (
            <div className="text-center mt-4 max-w-[560px] mx-auto">
              <p className={`text-foreground text-base leading-relaxed ${!bioExpanded ? "line-clamp-3" : ""}`}>
                {profile.bio}
              </p>
              {profile.bio.length > 180 && (
                <button onClick={() => setBioExpanded(!bioExpanded)} className="text-primary text-sm mt-1 font-medium">
                  {bioExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex justify-center gap-3 mt-4">
              {socialLinks.map((link: any) => {
                const Icon = socialIcons[link.platform.toLowerCase()] || socialIcons.newsletter;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors bg-secondary"
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                  </a>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-6">
            {[
              { value: memberCount, label: "Members" },
              { value: totalLessons, label: "Lessons" },
              { value: postCount, label: "Posts" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-foreground font-bold text-lg">{value}</div>
                <div className="text-muted-foreground text-xs">{label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center mt-6 mb-8">
            {isMember || memberSubStatus?.status === "active" ? (
              <div className="flex items-center gap-3">
                <Link
                  to={`/community/${profile.user_id}/community`}
                  className="px-8 py-3 rounded-lg text-sm font-semibold text-primary"
                >
                  ✓ Member
                </Link>
                {!isOwner && user && (
                  <button
                    onClick={() => navigate(`/messages?to=${profile.user_id}`)}
                    aria-label={`Message ${creatorName}`}
                    className="px-4 py-3 rounded-xl text-sm font-semibold bg-secondary border border-border text-muted-foreground"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : memberSubStatus?.status === "past_due" ? (
              <button
                onClick={async () => {
                  if (!memberSubStatus.stripe_customer_id) return;
                  setJoinLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("stripe-create-portal", {
                      body: { customer_id: memberSubStatus.stripe_customer_id },
                    });
                    if (error) throw error;
                    if (data?.url) window.open(data.url, "_blank");
                  } catch {}
                  setJoinLoading(false);
                }}
                disabled={joinLoading}
                className="px-8 py-3 rounded-xl text-sm font-bold border-2 border-yellow-500 text-yellow-500"
              >
                {joinLoading ? <BuyLoader className="w-4 h-4 animate-spin" /> : "⚠️ Update Payment →"}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleJoin}
                  disabled={joinLoading}
                  className="px-8 py-3 rounded-xl text-sm font-bold transition-shadow disabled:opacity-50"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--background))",
                    boxShadow: "0 0 24px rgba(61, 124, 255,0.3)",
                    height: 48,
                  }}
                >
                  {joinLoading ? (
                    <BuyLoader className="w-4 h-4 animate-spin" />
                  ) : memberSubStatus?.status === "canceled" ? (
                    `Rejoin — $${(memberSubStatus as any)?.subscription_tiers?.price_monthly || tiers[0]?.price_monthly || ""}/mo`
                  ) : tiers.length > 0 ? (
                    `Join — $${tiers[0].price_monthly}/mo`
                  ) : (
                    `Join ${creatorName}'s Community →`
                  )}
                </button>
                {!isOwner && user && (
                  <>
                    <AddFriendButton targetUserId={profile.user_id} size="md" />
                    <button
                      onClick={() => navigate(`/messages?to=${profile.user_id}`)}
                      aria-label={`Message ${creatorName}`}
                      className="px-4 py-3 rounded-xl text-sm font-semibold bg-secondary border border-border text-muted-foreground"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
            {space && !space.is_free && !isMember && !memberSubStatus?.status && (
              <p className="text-muted-foreground text-xs mt-2">From ${Number(space.price).toFixed(0)}/month</p>
            )}
          </div>
        </div>
      </section>

      {/* LIVE NOW SECTION */}
      {isLive && (
        <section id="live-section" className="max-w-[720px] mx-auto px-4 mb-8">
          <div className="rounded-xl p-4" style={{ background: "hsl(var(--background))", border: "2px solid #FF3B3B", boxShadow: "0 0 20px rgba(255,59,59,0.15)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white animate-pulse" style={{ background: "hsl(var(--destructive))" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE NOW
              </span>
              <span className="text-white text-sm font-semibold flex-1">{liveStream.title || "Untitled Stream"}</span>
              <span className="text-muted-foreground text-xs">{liveStream.viewer_count || 0} watching</span>
            </div>
            {liveStream.mux_playback_id ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={`https://stream.mux.com/${liveStream.mux_playback_id}.m3u8`}
                  className="w-full h-full"
                  allow="autoplay"
                  title="Live Stream"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--card))" }}>
                <p className="text-muted-foreground text-sm animate-pulse">Stream loading...</p>
              </div>
            )}
            {!isMember && (
              <button onClick={handleJoin} className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}>
                Join to chat and support {creatorName} →
              </button>
            )}
          </div>
        </section>
      )}

      {/* COMMUNITY PREVIEW */}
      {posts.length > 0 && (
        <section className="max-w-[720px] mx-auto px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold">Community</h2>
            <span className="text-muted-foreground text-sm">{memberCount} members</span>
          </div>
          <div className="space-y-3">
            {posts.map((post: any) => (
              <div key={post.id} className="relative rounded-lg p-4" style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}>
                {!isMember && (
                  <div className="absolute inset-0 rounded-lg z-10 flex flex-col items-center justify-center backdrop-blur-sm" style={{ background: "rgba(10,10,10,0.7)" }}>
                    <Lock className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-muted-foreground text-xs">Join to read the full post</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {(post as any).profiles?.avatar_url ? (
                    <img src={(post as any).profiles.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" loading="lazy" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(var(--card))", color: "hsl(var(--primary))" }}>
                      {((post as any).profiles?.display_name || "U").charAt(0)}
                    </div>
                  )}
                  <span className="text-white text-sm font-medium">{(post as any).profiles?.display_name || "Member"}</span>
                  <span className="text-muted-foreground text-xs ml-auto">{formatTimeAgo(post.created_at)}</span>
                </div>
                <h3 className="text-white text-[15px] font-semibold truncate">{post.title}</h3>
                <p className="text-muted-foreground text-[13px] line-clamp-2 mt-1">{post.body}</p>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.like_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post.comment_count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            {!isMember ? (
              <button onClick={handleJoin} className="text-primary text-sm font-medium">
                More posts inside. Join the community →
              </button>
            ) : (
              <Link to={`/community/${profile.user_id}/community`} className="text-primary text-sm font-medium">
                View all posts →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* COURSE CATALOG */}
      {modules.length > 0 && (
        <section className="max-w-[720px] mx-auto px-4 mb-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold">Courses</h2>
            <span className="text-muted-foreground text-sm">{totalLessons} lessons</span>
          </div>
          <div className="space-y-3">
            {modules.map((mod: any) => (
              <div key={mod.id} className="rounded-lg overflow-hidden" style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}>
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <h3 className="text-white text-base font-semibold">{mod.title}</h3>
                    <p className="text-muted-foreground text-[13px] mt-0.5">{mod.lessons?.length || 0} lessons</p>
                  </div>
                  {expandedModules.has(mod.id) ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {expandedModules.has(mod.id) && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-1">
                        {mod.lessons?.map((lesson: any) => (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => {
                              if (lesson.is_free) {
                                navigate(`/community/${profile.user_id}/classroom`);
                              }
                            }}
                          >
                            {lesson.is_free ? (
                              <Play className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-white text-sm flex-1 truncate">{lesson.title}</span>
                            {lesson.is_free && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}>FREE</span>
                            )}
                            {lesson.duration_seconds > 0 && (
                              <span className="text-muted-foreground text-xs">{formatDuration(lesson.duration_seconds)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MUSIC */}
      <CreatorMusicSection userId={profile?.user_id} username={profile?.username} isOwner={!!isOwner} />

      {/* DIGITAL PRODUCTS / SHOP */}
      {products.length > 0 && (
        <section className="max-w-[720px] mx-auto px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold">Shop</h2>
            <span className="text-muted-foreground text-sm">{products.length} product{products.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((product: any) => {
              const isFreeProduct = !product.price || product.price === 0;
              const typeEmoji: Record<string, string> = { digital: "📦", course: "📚", community: "🤝", coaching: "🎯" };
              return (
                <div
                  key={product.id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}
                >
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} loading="lazy" className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{typeEmoji[product.type] || "📦"}</span>
                      <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))" }}>
                        {product.type}
                      </span>
                    </div>
                    <h3 className="text-white text-sm font-bold mt-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-muted-foreground text-xs line-clamp-2 mt-1">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-primary font-bold text-base">
                        {isFreeProduct ? "Free" : `$${product.price}`}
                      </span>
                      {!isOwner && !isFreeProduct && (
                        <button
                          onClick={() => handleBuyProduct(product.id)}
                          disabled={buyingProductId === product.id}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}
                        >
                          {buyingProductId === product.id ? (
                            <BuyLoader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Buy Now"
                          )}
                        </button>
                      )}
                      {!isOwner && isFreeProduct && (
                        <button
                          onClick={() => navigate(`/community/${profile.user_id}/${product.type === 'course' ? 'classroom' : 'community'}`)}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: "hsl(var(--card))", color: "hsl(var(--primary))", border: "1px solid #1E1E1E" }}
                        >
                          Access Free
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SMARTLINKS — Music & Links */}
      {smartLinks.length > 0 && (
        <section className="max-w-[720px] mx-auto px-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold">🎵 Music & Links</h2>
            <span className="text-muted-foreground text-sm">
              {smartLinks.length} link{smartLinks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {smartLinks.map((sl: any) => (
              <a
                key={sl.id}
                href={`/link/${sl.slug}`}
                className="block rounded-xl overflow-hidden transition-transform active:scale-95"
                style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}
              >
                <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                  {sl.cover_image_url ? (
                    <img src={sl.cover_image_url} alt={sl.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🎵</span>
                  )}
                  {sl.is_presave && (
                    <span
                      className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}
                    >
                      Pre-save
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-white text-xs font-bold truncate">{sl.title}</p>
                  {sl.artist && (
                    <p className="text-muted-foreground text-[11px] truncate mt-0.5">{sl.artist}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* MILESTONES */}
      {profile?.user_id && <CreatorMilestones creatorId={profile.user_id} />}

      {/* EVENTS */}
      <CreatorProfileEvents username={username} />

      {/* TESTIMONIALS */}
      {profile?.user_id && <CreatorTestimonials creatorId={profile.user_id} isOwner={!!isOwner} />}

      {/* MOBILE STICKY BOTTOM BAR */}
      <AnimatePresence>
        {showStickyBar && !isOwner && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center gap-3 px-4 py-3 safe-area-bottom"
            style={{ background: "rgba(10,10,10,0.95)", borderTop: "1px solid #1E1E1E", backdropFilter: "blur(12px)" }}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: "2px solid #3D7CFF" }} alt="" loading="lazy" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "hsl(var(--card))", color: "hsl(var(--primary))", border: "2px solid #3D7CFF" }}>
                {creatorName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{creatorName}</p>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /> LIVE
                </span>
              )}
            </div>
            <button
              onClick={handleJoin}
              className="px-4 py-2 rounded-lg text-xs font-bold shrink-0"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--background))" }}
            >
              {isMember ? "Open" : "Join Community →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT DRAWER */}
      {isOwner && (
        <CreatorProfileEditDrawer
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          socialLinks={socialLinks}
      />
      )}

      {/* COURSE ENROLL SHEET */}
      {enrollProduct && (
        <CourseEnrollSheet
          open={!!enrollProduct}
          onClose={() => setEnrollProduct(null)}
          product={enrollProduct}
          creatorName={creatorName}
          creatorAvatar={profile?.avatar_url}
          creatorUsername={username}
          lessonCount={totalLessons}
          moduleCount={modules.length}
        />
      )}

      {/* SUBSCRIPTION PURCHASE OVERLAY */}
      {purchaseOverlayTier && (
        <PurchaseOverlay
          isOpen={!!purchaseOverlayTier}
          onClose={() => setPurchaseOverlayTier(null)}
          onSuccess={() => {
            setPurchaseOverlayTier(null);
            toast.success("Welcome to the community! 🎉");
          }}
          purchaseType="subscription"
          purchaseParams={{ tier_id: purchaseOverlayTier.id, creator_id: profile?.user_id, creator_username: username }}
          title={`Join ${creatorName}'s Community`}
          description={purchaseOverlayTier.description || undefined}
          price={purchaseOverlayTier.price_monthly}
        />
      )}
    </div>
  );
}

function CreatorProfileEvents({ username }: { username?: string }) {
  const navigate = useNavigate();
  const { data: events } = useQuery({
    queryKey: ["creator-profile-events", username],
    enabled: !!username,
    queryFn: async () => {
      const { data: prof } = await supabase.from("profiles").select("user_id").eq("username", username).maybeSingle();
      if (!prof) return [];
      const { data } = await (supabase as any).from("events").select("*").eq("creator_id", prof.user_id).eq("status", "published").order("starts_at", { ascending: true }).limit(6);
      return data || [];
    },
  });

  if (!events?.length) return null;

  const now = new Date();
  const upcoming = events.filter((e: any) => new Date(e.ends_at) >= now);
  const past = events.filter((e: any) => new Date(e.ends_at) < now);

  return (
    <section className="max-w-[720px] mx-auto px-4 mb-8">
      <h2 className="text-white text-xl font-bold mb-4">Events</h2>
      <div className="space-y-3">
        {upcoming.map((event: any) => (
          <div
            key={event.id}
            onClick={() => navigate(`/${username}/events/${event.slug}`)}
            className="rounded-lg p-4 cursor-pointer hover:border-primary/40 transition-colors"
            style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-[15px] font-semibold truncate">{event.title}</h3>
                <p className="text-primary text-xs mt-1">
                  {new Date(event.starts_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {new Date(event.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-white text-sm font-semibold ml-3">
                {event.is_free ? <span style={{ color: "hsl(var(--primary))" }}>FREE</span> : `$${event.ticket_price}`}
              </span>
            </div>
          </div>
        ))}
        {past.map((event: any) => (
          <div
            key={event.id}
            className="rounded-lg p-4 opacity-50"
            style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-[15px] font-semibold truncate">{event.title}</h3>
                <p className="text-muted-foreground text-xs mt-1">Ended</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <div className="h-14" style={{ borderBottom: "1px solid #1E1E1E" }} />
      <div className="h-44 w-full animate-pulse" style={{ background: "hsl(var(--background))" }} />
      <div className="max-w-[720px] mx-auto px-4 -mt-12 relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full animate-pulse" style={{ background: "hsl(var(--card))", border: "3px solid #222" }} />
        <div className="h-7 w-48 rounded mt-4 animate-pulse" style={{ background: "hsl(var(--card))" }} />
        <div className="h-4 w-24 rounded mt-2 animate-pulse" style={{ background: "hsl(var(--card))" }} />
        <div className="h-4 w-80 rounded mt-4 animate-pulse" style={{ background: "hsl(var(--card))" }} />
        <div className="h-4 w-64 rounded mt-2 animate-pulse" style={{ background: "hsl(var(--card))" }} />
        <div className="flex gap-8 mt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-5 w-8 rounded animate-pulse" style={{ background: "hsl(var(--card))" }} />
              <div className="h-3 w-12 rounded animate-pulse" style={{ background: "hsl(var(--card))" }} />
            </div>
          ))}
        </div>
        <div className="h-12 w-64 rounded-xl mt-6 animate-pulse" style={{ background: "hsl(var(--card))" }} />
      </div>
      <div className="max-w-[720px] mx-auto px-4 mt-8 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-lg animate-pulse" style={{ background: "hsl(var(--background))" }} />
        ))}
      </div>
    </div>
  );
}
