import { useEffect, useRef } from "react";
import { useShoppableFeed } from "@/hooks/useShoppableFeed";
import AppLayout from "@/components/layout/AppLayout";
import { Loader2, ShoppingBag } from "lucide-react";
import ShopProductOverlay from "@/components/shop/ShopProductOverlay";
import CartCheckoutReturn from "@/components/shop/CartCheckoutReturn";
import { useCartContext } from "@/context/CartContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

export default function Shop() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useShoppableFeed();
  const { itemCount, openDrawer } = useCartContext();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "800px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = data?.pages.flat() ?? [];

  return (
    <AppLayout>
      <SEOHead title="Shop — UPLY" description="Tap-to-buy products featured in your favorite creators' content." />
      <CartCheckoutReturn />

      <div className="max-w-2xl mx-auto pb-24">
        <header className="px-4 pt-6 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shop</h1>
            <p className="text-sm text-muted-foreground">Featured in creator content</p>
          </div>
          <button
            onClick={openDrawer}
            className="relative p-2.5 rounded-full bg-card border border-border hover:bg-accent transition-colors"
            aria-label="Open cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                {itemCount}
              </span>
            )}
          </button>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No shoppable content yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Creators can pin a product on their clips, shorts, and streams.
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-3">
            {items.map((item) => {
              const link =
                item.content_type === "clip"
                  ? `/clips/${item.content_id}`
                  : item.content_type === "short"
                    ? `/shorts?id=${item.content_id}`
                    : `/videos/${item.content_id}`;
              return (
                <article
                  key={`${item.content_type}-${item.content_id}`}
                  className="relative rounded-2xl overflow-hidden bg-card border border-border"
                >
                  <Link to={link} className="block aspect-[9/12] bg-muted relative">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : item.playback_id ? (
                      <img
                        src={`https://image.mux.com/${item.playback_id}/thumbnail.jpg?width=540`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                    )}

                    {/* Creator overlay (top) */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={item.creator?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px]">{item.creator?.display_name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-white font-medium truncate max-w-[120px]">
                        {item.creator?.display_name ?? "Creator"}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="absolute bottom-20 left-3 right-3">
                      <p className="text-white text-sm font-semibold line-clamp-2 drop-shadow-lg">{item.title}</p>
                    </div>
                  </Link>

                  {/* Product card */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <ShopProductOverlay
                      productId={item.product_id}
                      contentType={item.content_type}
                      contentId={item.content_id}
                      variant="card"
                    />
                  </div>
                </article>
              );
            })}

            <div ref={sentinelRef} className="h-1" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasNextPage && items.length > 6 && (
              <p className="text-center text-xs text-muted-foreground py-6">You're all caught up ✨</p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
