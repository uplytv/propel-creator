import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ShoppingStream {
  id: string;
  title: string | null;
  category: string | null;
  mux_playback_id: string | null;
  viewer_count: number | null;
  user_id: string;
  product_count: number;
  featured_product?: {
    name: string;
    price: number;
    image_url: string | null;
  } | null;
}

function thumb(playbackId: string | null) {
  return playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=preserve` : null;
}

export default function LiveShoppingGrid() {
  const [items, setItems] = useState<ShoppingStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Fetch live streams
      const { data: streams } = await supabase
        .from("mux_live_streams")
        .select("id, title, category, mux_playback_id, viewer_count, user_id, status, is_public")
        .eq("status", "active")
        .eq("is_public", true)
        .limit(60);

      const streamIds = (streams || []).map((s: any) => s.id);
      if (!streamIds.length) {
        if (!cancelled) { setItems([]); setLoading(false); }
        return;
      }

      // Find streams that have products attached
      const { data: links } = await supabase
        .from("live_stream_products")
        .select("stream_id, product_id, is_currently_featured, position")
        .in("stream_id", streamIds);

      const byStream = new Map<string, any[]>();
      (links || []).forEach((l: any) => {
        const arr = byStream.get(l.stream_id) || [];
        arr.push(l);
        byStream.set(l.stream_id, arr);
      });

      const productIds = Array.from(new Set((links || []).map((l: any) => l.product_id)));
      const { data: products } = productIds.length
        ? await supabase.from("products").select("id, name, price, image_url").in("id", productIds)
        : { data: [] as any[] };
      const productMap = new Map((products || []).map((p: any) => [p.id, p]));

      const result: ShoppingStream[] = (streams || [])
        .filter((s: any) => byStream.has(s.id))
        .map((s: any) => {
          const links = byStream.get(s.id)!;
          const featuredLink = links.find((l) => l.is_currently_featured) || links[0];
          const featured = featuredLink ? productMap.get(featuredLink.product_id) : null;
          return {
            ...s,
            product_count: links.length,
            featured_product: featured ? { name: featured.name, price: featured.price, image_url: featured.image_url } : null,
          };
        })
        .sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));

      if (!cancelled) { setItems(result); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-lg bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <ShoppingBag className="w-8 h-8 text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          No live shopping right now
        </h3>
        <p className="text-[13px] text-muted-foreground text-center max-w-xs">
          Creators selling products live will appear here. Check back soon!
        </p>
      </div>
    );
  }

  return (
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
              <div className="flex items-center gap-2 pt-1">
                {s.featured_product.image_url && (
                  <img src={s.featured_product.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
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
  );
}
