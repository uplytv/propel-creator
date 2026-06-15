import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProductInfo {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface LinkRow {
  stream_id: string;
  product_id: string;
  is_currently_featured: boolean;
  position: number;
}

interface ShoppingStream {
  id: string;
  title: string | null;
  category: string | null;
  mux_playback_id: string | null;
  viewer_count: number | null;
  user_id: string;
  product_count: number;
  featured_product?: ProductInfo | null;
}

function thumb(playbackId: string | null) {
  return playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=preserve` : null;
}

export default function LiveShoppingGrid() {
  const [streams, setStreams] = useState<Record<string, any>>({});
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: streamRows } = await supabase
      .from("mux_live_streams")
      .select("id, title, category, mux_playback_id, viewer_count, user_id, status, is_public")
      .eq("status", "active")
      .eq("is_public", true)
      .limit(60);

    const streamIds = (streamRows || []).map((s: any) => s.id);
    const streamMap: Record<string, any> = {};
    (streamRows || []).forEach((s: any) => { streamMap[s.id] = s; });
    setStreams(streamMap);

    if (!streamIds.length) {
      setLinks([]); setProducts({}); setLoading(false); return;
    }

    const { data: linkRows } = await supabase
      .from("live_stream_products")
      .select("stream_id, product_id, is_currently_featured, position")
      .in("stream_id", streamIds);
    const linksData = (linkRows || []) as LinkRow[];
    setLinks(linksData);

    const productIds = Array.from(new Set(linksData.map((l) => l.product_id)));
    if (productIds.length) {
      const { data: productRows } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .in("id", productIds);
      const pMap: Record<string, ProductInfo> = {};
      (productRows || []).forEach((p: any) => { pMap[p.id] = p; });
      setProducts(pMap);
    } else {
      setProducts({});
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("live-shopping-discover")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_stream_products" }, (payload: any) => {
        setLinks((prev) => {
          if (payload.eventType === "DELETE") {
            return prev.filter((l) => !(l.stream_id === payload.old.stream_id && l.product_id === payload.old.product_id));
          }
          const row = payload.new as LinkRow;
          const filtered = prev.filter((l) => !(l.stream_id === row.stream_id && l.product_id === row.product_id));
          return [...filtered, row];
        });
        // Fetch product details if new
        if (payload.eventType !== "DELETE") {
          const pid = payload.new.product_id;
          setProducts((prev) => {
            if (prev[pid]) return prev;
            supabase.from("products").select("id, name, price, image_url").eq("id", pid).maybeSingle()
              .then(({ data }) => {
                if (data) setProducts((p) => ({ ...p, [pid]: data as ProductInfo }));
              });
            return prev;
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload: any) => {
        const p = payload.new;
        setProducts((prev) => prev[p.id] ? { ...prev, [p.id]: { id: p.id, name: p.name, price: p.price, image_url: p.image_url } } : prev);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "mux_live_streams" }, (payload: any) => {
        if (payload.eventType === "DELETE") {
          setStreams((prev) => {
            const { [payload.old.id]: _, ...rest } = prev;
            return rest;
          });
          return;
        }
        const s = payload.new;
        if (s.status === "active" && s.is_public) {
          setStreams((prev) => ({ ...prev, [s.id]: s }));
        } else {
          setStreams((prev) => {
            if (!prev[s.id]) return prev;
            const { [s.id]: _, ...rest } = prev;
            return rest;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Derive items
  const allItems: ShoppingStream[] = Object.values(streams)
    .map((s: any) => {
      const sLinks = links.filter((l) => l.stream_id === s.id);
      if (!sLinks.length) return null;
      const featuredLink = sLinks.find((l) => l.is_currently_featured) || sLinks.sort((a, b) => a.position - b.position)[0];
      const featured = featuredLink ? products[featuredLink.product_id] || null : null;
      return {
        ...s,
        product_count: sLinks.length,
        featured_product: featured,
        has_featured: sLinks.some((l) => l.is_currently_featured),
      };
    })
    .filter(Boolean) as (ShoppingStream & { has_featured: boolean })[];

  // Filter & sort state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"viewers" | "price_low" | "price_high" | "featured">("viewers");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const categories = Array.from(new Set(allItems.map((i) => i.category).filter(Boolean))) as string[];

  const items = allItems.filter((i) => {
    if (featuredOnly && !(i as any).has_featured) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  items.sort((a, b) => {
    if (sortBy === "viewers") return (b.viewer_count || 0) - (a.viewer_count || 0);
    if (sortBy === "featured") return Number((b as any).has_featured) - Number((a as any).has_featured);
    const ap = a.featured_product?.price ?? Number.POSITIVE_INFINITY;
    const bp = b.featured_product?.price ?? Number.POSITIVE_INFINITY;
    return sortBy === "price_low" ? ap - bp : bp - ap;
  });

  const Controls = (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="h-9 px-3 text-sm rounded-md bg-card border border-border text-foreground"
        style={{ fontSize: 16 }}
      >
        <option value="all">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as any)}
        className="h-9 px-3 text-sm rounded-md bg-card border border-border text-foreground"
        style={{ fontSize: 16 }}
      >
        <option value="viewers">Most viewers</option>
        <option value="featured">Featured first</option>
        <option value="price_low">Price: Low to High</option>
        <option value="price_high">Price: High to Low</option>
      </select>
      <button
        onClick={() => setFeaturedOnly((v) => !v)}
        className={`h-9 px-3 text-xs font-semibold rounded-md border transition-colors min-h-[36px] ${
          featuredOnly
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:text-foreground"
        }`}
      >
        🔥 Featured only
      </button>
    </div>
  );

  if (loading) {
    return (
      <>
        {Controls}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-lg bg-card animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        {Controls}
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <ShoppingBag className="w-8 h-8 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            No live shopping matches
          </h3>
          <p className="text-[13px] text-muted-foreground text-center max-w-xs">
            Try clearing filters or check back soon — creators selling live will show up here.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {Controls}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {items.map((s) => (
          <Link
            key={s.id}
            to={`/stream/${s.id}`}
            className="group block rounded-lg overflow-hidden bg-card hover:scale-[1.02] transition-transform"
          >
            <div className="aspect-video bg-black relative">
              {thumb(s.mux_playback_id) ? (
                <img src={thumb(s.mux_playback_id)!} alt={s.title || "Live"} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Radio className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </span>
              <span className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" /> {s.product_count}
              </span>
              {(s.viewer_count ?? 0) > 0 && (
                <span className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-0.5 text-[10px] rounded">
                  {s.viewer_count} watching
                </span>
              )}
            </div>
            <div className="p-3 space-y-1.5">
              <div className="text-sm font-semibold line-clamp-1">{s.title || "Live shopping"}</div>
              {s.featured_product && (
                <div className="flex items-center gap-2 pt-1 transition-all">
                  {s.featured_product.image_url && (
                    <img src={s.featured_product.image_url} alt={s.featured_product.name} loading="lazy" className="w-8 h-8 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{s.featured_product.name}</div>
                    <div className="text-xs font-bold text-primary">${s.featured_product.price}</div>
                  </div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
