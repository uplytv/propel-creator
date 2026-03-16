import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Heart, MessageCircle, Lock, Play, ChevronDown, ChevronUp,
  ExternalLink, Users, BookOpen, FileText, Pencil
} from "lucide-react";
import CreatorProfileEditDrawer from "@/components/creator-profile/CreatorProfileEditDrawer";
import SEOHead from "@/components/SEOHead";

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
      // Try username first, then display_name as fallback — use public view to hide financial fields
      let { data, error } = await (supabase as any)
        .from("profiles_public")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (!data) {
        const res = await (supabase as any)
          .from("profiles_public")
          .select("*")
          .eq("display_name", username!)
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
        .from("mux_live_streams_public" as any)
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
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

  return {
    profile: profileQuery.data,
    profileLoading: profileQuery.isLoading,
    socialLinks: socialLinksQuery.data || [],
    liveStream: liveStreamQuery.data,
    memberCount: memberCountQuery.data || 0,
    posts: postsQuery.data || [],
    modules: modulesQuery.data || [],
    totalLessons: totalLessonsQuery.data || 0,
    isMember: isMemberQuery.data || false,
    space: spaceQuery.data,
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

// SEO head injection
function useCreatorSEO(profile: any) {
  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name || "Creator";
    const bio = profile.bio ? profile.bio.substring(0, 160) : "";
    const avatar = profile.avatar_url || "/logo.png";
    const username = profile.username || profile.display_name || "";

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
    setMeta("property", "og:url", `https://uply.tv/creator/${username}`);
    setMeta("property", "og:type", "profile");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", `${name} on UPLY`);
    setMeta("name", "twitter:description", bio);
    setMeta("name", "twitter:image", avatar);

    return () => {
      document.title = "UPLY";
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

  const {
    profile, profileLoading, socialLinks, liveStream,
    memberCount, posts, modules, totalLessons, isMember, space,
  } = useCreatorProfileData(username);

  useCreatorSEO(profile);

  const isOwner = user && profile && user.id === profile.user_id;
  const isLive = !!liveStream;
  const creatorName = profile?.display_name || "Creator";

  // Sticky bar scroll logic
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

  const handleJoin = () => {
    if (!user) {
      navigate(`/auth?ref=${username}`);
    } else {
      navigate(`/community/${profile?.user_id}/community`);
    }
  };

  // Loading
  if (profileLoading) {
    return (
      <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
        <ProfileSkeleton />
      </div>
    );
  }

  // 404
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold text-white mb-2">This creator doesn't exist yet.</h1>
          <p className="text-[#888] mb-6">The page you're looking for isn't available.</p>
          <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm" style={{ background: "#00FF85", color: "#0A0A0A" }}>
            Start your own UPLY →
          </Link>
        </div>
      </div>
    );
  }

  const postCount = posts.length;

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <SEOHead
        title={profile.display_name || profile.username || "Creator"}
        description={profile.bio || `Check out ${profile.display_name || profile.username}'s community, courses, and live streams on Uply.`}
        image={profile.avatar_url || undefined}
      />
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 backdrop-blur-xl" style={{ background: "rgba(10,10,10,0.85)", borderBottom: "1px solid #1E1E1E" }}>
        <Link to="/" className="font-bold text-lg text-white tracking-tight">UPLY</Link>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: "#1a1a1a", border: "1px solid #1E1E1E" }}>
              <Pencil className="w-3.5 h-3.5" /> Edit Profile
            </button>
          ) : !user ? (
            <>
              <Link to="/auth" className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#888] hover:text-white transition-colors">Log In</Link>
              <Link to="/auth" className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>Start Free →</Link>
            </>
          ) : null}
        </div>
      </nav>

      {/* PROFILE HEADER */}
      <section className="relative">
        {/* Cover */}
        <div className="h-44 w-full relative overflow-hidden">
          {profile.cover_image_url ? (
            <img src={profile.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(180deg, #111 0%, #0A0A0A 100%)" }} />
          )}
          {/* Green glow behind avatar */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,255,133,0.05) 0%, transparent 70%)" }} />
        </div>

        <div className="max-w-[720px] mx-auto px-4 -mt-12 relative z-10">
          {/* Avatar */}
          <div className="flex justify-center relative">
            <div className="relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={creatorName} className="w-24 h-24 rounded-full object-cover" style={{ border: "3px solid #00FF85" }} />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold" style={{ border: "3px solid #00FF85", background: "#1a1a1a", color: "#00FF85" }}>
                  {creatorName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* LIVE badge on avatar */}
              {isLive && (
                <button
                  onClick={() => document.getElementById("live-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-bold animate-pulse"
                  style={{ background: "#FF3B3B" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                </button>
              )}
            </div>
          </div>

          {/* Name + username */}
          <div className="text-center mt-4">
            <h1 className="text-[28px] font-extrabold text-white">{creatorName}</h1>
            <p className="text-sm text-[#888] mt-0.5">@{profile.username || profile.display_name || username}</p>
          </div>

          {/* Type pill */}
          {profile.creator_type && (
            <div className="flex justify-center mt-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "#1a1a1a", color: "#00FF85" }}>
                {profile.creator_type}{profile.business_category ? ` · ${profile.business_category}` : ""}
              </span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="text-center mt-4 max-w-[560px] mx-auto">
              <p className={`text-white text-base leading-relaxed ${!bioExpanded ? "line-clamp-3" : ""}`}>
                {profile.bio}
              </p>
              {profile.bio.length > 180 && (
                <button onClick={() => setBioExpanded(!bioExpanded)} className="text-[#00FF85] text-sm mt-1 font-medium">
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
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#666] hover:text-[#00FF85] transition-colors"
                    style={{ background: "#1a1a1a" }}
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
                <div className="text-white font-bold text-lg">{value}</div>
                <div className="text-[#888] text-xs">{label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center mt-6 mb-8">
            {isMember ? (
              <Link
                to={`/community/${profile.user_id}/community`}
                className="px-8 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "#1a1a1a", border: "1px solid #1E1E1E", color: "#888" }}
              >
                ✓ Member
              </Link>
            ) : (
              <button
                onClick={handleJoin}
                className="px-8 py-3 rounded-xl text-sm font-bold transition-shadow"
                style={{
                  background: "#00FF85",
                  color: "#0A0A0A",
                  boxShadow: "0 0 24px rgba(0,255,133,0.3)",
                  height: 48,
                }}
              >
                Join {creatorName}'s Community →
              </button>
            )}
            {space && !space.is_free && (
              <p className="text-[#888] text-xs mt-2">From ${Number(space.price).toFixed(0)}/month</p>
            )}
          </div>
        </div>
      </section>

      {/* LIVE NOW SECTION */}
      {isLive && (
        <section id="live-section" className="max-w-[720px] mx-auto px-4 mb-8">
          <div className="rounded-xl p-4" style={{ background: "#111", border: "2px solid #FF3B3B", boxShadow: "0 0 20px rgba(255,59,59,0.15)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white animate-pulse" style={{ background: "#FF3B3B" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE NOW
              </span>
              <span className="text-white text-sm font-semibold flex-1">{liveStream.title || "Untitled Stream"}</span>
              <span className="text-[#888] text-xs">{liveStream.viewer_count || 0} watching</span>
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
              <div className="aspect-video rounded-lg flex items-center justify-center" style={{ background: "#1a1a1a" }}>
                <p className="text-[#888] text-sm animate-pulse">Stream loading...</p>
              </div>
            )}
            {!isMember && (
              <button onClick={handleJoin} className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#00FF85", color: "#0A0A0A" }}>
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
            <span className="text-[#888] text-sm">{memberCount} members</span>
          </div>
          <div className="space-y-3">
            {posts.map((post: any) => (
              <div key={post.id} className="relative rounded-lg p-4" style={{ background: "#111", border: "1px solid #1E1E1E" }}>
                {!isMember && (
                  <div className="absolute inset-0 rounded-lg z-10 flex flex-col items-center justify-center backdrop-blur-sm" style={{ background: "rgba(10,10,10,0.7)" }}>
                    <Lock className="w-5 h-5 text-[#888] mb-1" />
                    <span className="text-[#888] text-xs">Join to read the full post</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  {(post as any).profiles?.avatar_url ? (
                    <img src={(post as any).profiles.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#1a1a1a", color: "#00FF85" }}>
                      {((post as any).profiles?.display_name || "U").charAt(0)}
                    </div>
                  )}
                  <span className="text-white text-sm font-medium">{(post as any).profiles?.display_name || "Member"}</span>
                  <span className="text-[#555] text-xs ml-auto">{formatTimeAgo(post.created_at)}</span>
                </div>
                <h3 className="text-white text-[15px] font-semibold truncate">{post.title}</h3>
                <p className="text-[#888] text-[13px] line-clamp-2 mt-1">{post.body}</p>
                <div className="flex items-center gap-4 mt-2 text-[#555] text-xs">
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {post.like_count}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post.comment_count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            {!isMember ? (
              <button onClick={handleJoin} className="text-[#00FF85] text-sm font-medium">
                More posts inside. Join the community →
              </button>
            ) : (
              <Link to={`/community/${profile.user_id}/community`} className="text-[#00FF85] text-sm font-medium">
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
            <span className="text-[#888] text-sm">{totalLessons} lessons</span>
          </div>
          <div className="space-y-3">
            {modules.map((mod: any) => (
              <div key={mod.id} className="rounded-lg overflow-hidden" style={{ background: "#111", border: "1px solid #1E1E1E" }}>
                <button
                  onClick={() => toggleModule(mod.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <h3 className="text-white text-base font-semibold">{mod.title}</h3>
                    <p className="text-[#888] text-[13px] mt-0.5">{mod.lessons?.length || 0} lessons</p>
                  </div>
                  {expandedModules.has(mod.id) ? <ChevronUp className="w-4 h-4 text-[#888]" /> : <ChevronDown className="w-4 h-4 text-[#888]" />}
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
                              <Play className="w-4 h-4 text-[#00FF85] shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-[#555] shrink-0" />
                            )}
                            <span className="text-white text-sm flex-1 truncate">{lesson.title}</span>
                            {lesson.is_free && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "#00FF85", color: "#0A0A0A" }}>FREE</span>
                            )}
                            {lesson.duration_seconds > 0 && (
                              <span className="text-[#555] text-xs">{formatDuration(lesson.duration_seconds)}</span>
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

      {/* MOBILE STICKY BOTTOM BAR */}
      <AnimatePresence>
        {showStickyBar && !isOwner && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center gap-3 px-4 py-3 safe-area-bottom"
            style={{ background: "rgba(10,10,10,0.95)", borderTop: "1px solid #1E1E1E", backdropFilter: "blur(12px)" }}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: "2px solid #00FF85" }} alt="" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "#1a1a1a", color: "#00FF85", border: "2px solid #00FF85" }}>
                {creatorName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{creatorName}</p>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#FF3B3B]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B3B] animate-pulse" /> LIVE
                </span>
              )}
            </div>
            <button
              onClick={handleJoin}
              className="px-4 py-2 rounded-lg text-xs font-bold shrink-0"
              style={{ background: "#00FF85", color: "#0A0A0A" }}
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
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <div className="h-14" style={{ borderBottom: "1px solid #1E1E1E" }} />
      <div className="h-44 w-full animate-pulse" style={{ background: "#111" }} />
      <div className="max-w-[720px] mx-auto px-4 -mt-12 relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full animate-pulse" style={{ background: "#1a1a1a", border: "3px solid #222" }} />
        <div className="h-7 w-48 rounded mt-4 animate-pulse" style={{ background: "#1a1a1a" }} />
        <div className="h-4 w-24 rounded mt-2 animate-pulse" style={{ background: "#1a1a1a" }} />
        <div className="h-4 w-80 rounded mt-4 animate-pulse" style={{ background: "#1a1a1a" }} />
        <div className="h-4 w-64 rounded mt-2 animate-pulse" style={{ background: "#1a1a1a" }} />
        <div className="flex gap-8 mt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-5 w-8 rounded animate-pulse" style={{ background: "#1a1a1a" }} />
              <div className="h-3 w-12 rounded animate-pulse" style={{ background: "#1a1a1a" }} />
            </div>
          ))}
        </div>
        <div className="h-12 w-64 rounded-xl mt-6 animate-pulse" style={{ background: "#1a1a1a" }} />
      </div>
      <div className="max-w-[720px] mx-auto px-4 mt-8 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-lg animate-pulse" style={{ background: "#111" }} />
        ))}
      </div>
    </div>
  );
}
