import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Radio, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as unknown as any;

interface Props {
  creatorUserId: string;
  /** When the creator is currently live, used to badge the featured product. */
  liveStreamId?: string | null;
  liveFeaturedProductId?: string | null;
}

/**
 * Public Shop tab on a creator profile.
 * Lists the creator's active products with a "LIVE — Featured" badge when
 * a product is currently being featured in an active live stream, deep-linking
 * viewers into the live commerce flow.
 */
export default function CreatorShopTab({ creatorUserId, liveStreamId, liveFeaturedProductId }: Props) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["creator-shop-products", creatorUserId],
    enabled: !!creatorUserId,
    queryFn: async () => {
      const { data } = await sb
        .from("products")
        .select("id,name,description,price,image_url,type,sales")
        .eq("user_id", creatorUserId)
        .eq("status", "active")
        .order("sales", { ascending: false })
        .limit(60);
      return data || [];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="max-w-[720px] mx-auto px-4 mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="max-w-[560px] mx-auto px-6 mt-8 text-center text-muted-foreground">
        <ShoppingBag className="mx-auto h-8 w-8 mb-2 opacity-60" />
        <p className="text-sm">No products yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-4 mt-4">
      {liveStreamId && liveFeaturedProductId && (
        <Link
          to={`/live/${liveStreamId}`}
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-full text-[12px] font-bold text-white w-fit animate-pulse"
          style={{ background: "hsl(var(--destructive))", boxShadow: "0 0 18px rgba(255,59,59,0.35)" }}
        >
          <Radio className="w-3 h-3" /> Live shopping happening now — Tap to join
        </Link>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.map((p: any) => {
          const isLiveFeatured = !!liveStreamId && p.id === liveFeaturedProductId;
          const href = isLiveFeatured ? `/live/${liveStreamId}` : `/shop/${p.id}`;
          return (
            <Link
              key={p.id}
              to={href}
              className="group rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition relative"
            >
              <div className="aspect-square bg-muted overflow-hidden">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                )}
              </div>
              {isLiveFeatured && (
                <span
                  className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white animate-pulse"
                  style={{ background: "hsl(var(--destructive))" }}
                >
                  <Radio className="w-2.5 h-2.5" /> LIVE
                </span>
              )}
              <div className="p-2.5">
                <p className="text-sm font-semibold text-foreground line-clamp-1">{p.name}</p>
                <p className="text-xs text-primary font-bold mt-0.5">
                  ${Number(p.price || 0).toFixed(2)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
