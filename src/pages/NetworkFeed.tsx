import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Radio, Flame, ShoppingBag, Users, Sparkles, Play, Eye, Heart, TrendingUp, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/hooks/useFollows";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DiscoverShowcase from "@/components/discover/DiscoverShowcase";

type Tab = "foryou" | "live" | "trending" | "shop" | "following";

function LiveBadge() {
  return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive text-destructive-foreground animate-pulse">LIVE</span>;
}

function ContentCard({ item }: { item: any }) {
  const navigate = useNavigate();
  const thumb = item.thumbnail_url || (item.playback_id ? `https://image.mux.com/${item.playback_id}/thumbnail.jpg?time=5` : null);
  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={() => navigate(item.type === "live" ? `/stream/${item.id}` : `/stream/${item.id}?type=vod`)}
      className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/30 transition-all">
      <div className="relative aspect-video bg-muted">
        {thumb ? <img src={thumb} alt={item.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Play className="w-8 h-8 text-muted-foreground" /></div>}
        {item.type === "live" && <div className="absolute top-2 left-2 flex items-center gap-1.5"><LiveBadge /><span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-background/80 text-foreground backdrop-blur-sm"><Eye className="w-2.5 h-2.5 inline mr-0.5" />{(item.viewer_count || 0).toLocaleString()}</span></div>}
        {item.active_products > 0 && <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary text-primary-foreground"><ShoppingBag className="w-2.5 h-2.5 inline mr-0.5" />{item.active_products} live</div>}
        {!item.type?.includes("live") && item.duration_seconds && <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-background/80 text-foreground backdrop-blur-sm">{Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, "0")}</div>}
      </div>
      <div className="p-3">
        <div className="flex gap-2.5">
          {item.avatar_url ? <img src={item.avatar_url} alt={item.creator_name || ""} className="w-8 h-8 rounded-full object-cover shrink-0" loading="lazy" /> : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{(item.creator_name || "U")[0]}</div>}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground line-clamp-2">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.creator_name}</p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span><Eye className="w-3 h-3 inline mr-0.5" />{(item.view_count || 0).toLocaleString()}</span>
              <span><Heart className="w-3 h-3 inline mr-0.5" />{(item.like_count || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProductCard({ p }: { p: any }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/30 transition-all" onClick={() => navigate(`/stream/${p.stream_id}`)}>
      {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full aspect-square object-cover" loading="lazy" /> : <div className="w-full aspect-square bg-muted flex items-center justify-center text-3xl">🛍️</div>}
      <div className="p-3">
        <p className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-bold text-primary">${p.price}</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive text-destructive-foreground animate-pulse">LIVE</span>
        </div>
        <p className="text-[10px] text-primary font-semibold mt-1.5 text-center">Buy Now</p>
      </div>
    </div>
  );
}

function CreatorRow({ c }: { c: any }) {
  const navigate = useNavigate();
  const { isFollowing, follow, unfollow } = useFollows();
  const following = isFollowing(c.user_id);
  return (
    <div className="flex items-center gap-3 py-2">
      {c.avatar_url ? <img src={c.avatar_url} alt={c.display_name || ""} className="w-9 h-9 rounded-full object-cover" loading="lazy" /> : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{(c.display_name || "U")[0]}</div>}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/${c.username}`)}>
        <p className="text-sm font-semibold text-foreground truncate">{c.display_name}</p>
        <p className="text-[10px] text-muted-foreground">{(c.members || 0).toLocaleString()} members</p>
      </div>
      <button onClick={() => following ? unfollow(c.user_id) : follow(c.user_id)}
        className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all border"
        style={{ borderColor: following ? "hsl(var(--primary))" : "hsl(var(--border))", color: following ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", background: following ? "hsl(var(--primary) / 0.08)" : "transparent" }}>
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}

async function enrich(items: any[], idField: string, lookupField: "user_id" | "id") {
  return Promise.all((items || []).map(async (item: any) => {
    const { data: p } = await supabase.from("profiles").select("display_name, username, avatar_url").eq(lookupField, item[idField]).maybeSingle();
    return { ...item, creator_name: (p as any)?.display_name, username: (p as any)?.username, avatar_url: (p as any)?.avatar_url };
  }));
}

export default function NetworkFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("foryou");
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const PAGE = 24;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "foryou", label: "For You", icon: Sparkles },
    { id: "live", label: "Live Now", icon: Radio },
    { id: "trending", label: "Trending", icon: Flame },
    { id: "shop", label: "Shop Live", icon: ShoppingBag },
    { id: "following", label: "Following", icon: Users },
  ];

  useEffect(() => { setItems([]); setHasMore(true); load(0); }, [tab]);
  useEffect(() => { loadSidebar(); }, []);

  const load = async (offset: number) => {
    if (offset === 0) setLoading(true); else setLoadingMore(true);
    try {
      let newItems: any[] = [];
      if (tab === "live" || tab === "foryou") {
        const { data: live } = await supabase.from("mux_live_streams_public").select("id, title, mux_playback_id, viewer_count, category, user_id").eq("status", "active").eq("is_public", true).order("viewer_count", { ascending: false }).range(offset, offset + (tab === "live" ? PAGE : 8) - 1);
        const enrichedLive = await enrich((live || []).map((s: any) => ({ ...s, playback_id: s.mux_playback_id, type: "live" })), "user_id", "user_id");
        if (tab === "live") {
          newItems = enrichedLive;
        } else {
          const { data: recs } = await supabase.from("stream_recordings").select("id, title, playback_id, duration_seconds, view_count, creator_id").eq("is_published", true).order("view_count", { ascending: false }).range(offset, offset + 16 - 1);
          const enrichedRecs = await enrich((recs || []).map((r: any) => ({ ...r, type: "recording" })), "creator_id", "id");
          newItems = [...enrichedLive, ...enrichedRecs];
        }
      } else if (tab === "trending") {
        const { data: vids } = await supabase.from("videos").select("id, title, playback_id, thumbnail_url, duration_seconds, view_count, like_count, creator_id").eq("is_public", true).order("trending_score", { ascending: false }).range(offset, offset + PAGE - 1);
        newItems = await enrich((vids || []).map((v: any) => ({ ...v, type: "video" })), "creator_id", "user_id");
      } else if (tab === "shop") {
        const { data: p } = await supabase.from("live_products").select("id, title, price, image_url, stream_id, creator_id").eq("is_active", true).eq("is_sold_out", false).range(offset, offset + PAGE - 1);
        newItems = p || [];
      } else if (tab === "following" && user) {
        const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user.id).limit(100);
        const ids = (follows || []).map((f: any) => f.following_id);
        if (!ids.length) { setItems([]); setHasMore(false); setLoading(false); setLoadingMore(false); return; }
        const { data: live } = await supabase.from("mux_live_streams_public").select("id, title, mux_playback_id, viewer_count, user_id").in("user_id", ids).eq("status", "active").range(offset, offset + PAGE - 1);
        newItems = await enrich((live || []).map((s: any) => ({ ...s, playback_id: s.mux_playback_id, type: "live" })), "user_id", "user_id");
      }
      if (newItems.length < PAGE / 2) setHasMore(false);
      setItems((prev) => offset === 0 ? newItems : [...prev, ...newItems]);
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) load(items.length);
  }, [items.length, loadingMore, hasMore, loading, tab]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "800px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const loadSidebar = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("live_products").select("id, title, price, image_url, stream_id").eq("is_active", true).eq("is_sold_out", false).limit(4),
      supabase.from("profiles").select("user_id, display_name, username, avatar_url, members").eq("is_approved", true).order("members", { ascending: false }).limit(8),
    ]);
    setProducts(p || []);
    setCreators(c || []);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto pb-20 md:pb-8">
        <div className="px-4 md:px-8 pt-4 md:pt-8 pb-2">
          {/* Netflix-style discovery layer (additive — does not affect tabs/grid below) */}
          <DiscoverShowcase />

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">UPLY Network</h1>
              <p className="text-xs text-muted-foreground">Live now · Trending · Shop live</p>
            </div>
            <Button size="sm" onClick={() => navigate("/go-live")} className="gap-1.5"><Radio className="w-4 h-4" /> Go Live</Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0"
                style={{ background: tab === t.id ? "hsl(var(--primary))" : "hsl(var(--card))", color: tab === t.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))", border: tab === t.id ? "none" : "1px solid hsl(var(--border))" }}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
                {t.id === "live" && <LiveBadge />}
              </button>
            ))}
          </div>

          {/* 2-column layout */}
          <div className="flex gap-6">
            {/* Main feed */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
                </div>
              ) : tab === "shop" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {items.map((p: any) => <ProductCard key={p.id} p={p} />)}
                  {!items.length && <p className="col-span-full text-center text-sm text-muted-foreground py-12">No live products right now</p>}
                </div>
              ) : items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map((item: any) => <ContentCard key={item.id} item={item} />)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">{tab === "following" ? "Follow creators to see their content" : "Nothing here yet"}</p>
                  {tab === "following" && <Button variant="outline" size="sm" className="mt-3" onClick={() => setTab("foryou")}>Discover Creators</Button>}
                </div>
              )}

              {/* Infinite scroll sentinel */}
              {!loading && items.length > 0 && (
                <>
                  <div ref={sentinelRef} className="h-1 mt-6" />
                  {loadingMore && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!hasMore && (
                    <p className="text-center text-xs text-muted-foreground py-6">
                      You've seen everything ✨
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Right sidebar — hidden on mobile */}
            <div className="hidden lg:block w-72 space-y-6 shrink-0">
              {products.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-primary" /> Selling Live Now</p>
                    <button onClick={() => setTab("shop")} className="text-[10px] text-primary hover:underline">See all →</button>
                  </div>
                  <div className="space-y-2">{products.map((p: any) => <ProductCard key={p.id} p={p} />)}</div>
                </div>
              )}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" /> Top Creators</p>
                  <button onClick={() => navigate("/discover")} className="text-[10px] text-primary hover:underline">See all →</button>
                </div>
                {creators.map((c: any) => <CreatorRow key={c.user_id} c={c} />)}
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                <Radio className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Ready to go live?</p>
                <p className="text-xs text-muted-foreground mb-3">Sell products, earn tips, grow your audience</p>
                <Button size="sm" onClick={() => navigate("/go-live")} className="w-full gap-1.5"><Zap className="w-4 h-4" /> Start Streaming</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
