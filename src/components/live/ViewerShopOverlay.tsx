import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Gift, X } from "lucide-react";
import { useLiveShop, type LiveProduct, type LiveAuction, type LiveProductVariant } from "@/hooks/useLiveShop";
import { Drawer } from "vaul";

interface Props {
  streamId: string;
  creatorUserId: string;
}

function FlashSaleCountdown({ endsAt }: { endsAt: string }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => setSecs(Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return <span className="text-white font-black text-sm font-mono tabular-nums">{secs}s</span>;
}

function AuctionCountdown({ endsAt, onEnd }: { endsAt: string; onEnd?: () => void }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      const secs = Math.max(0, Math.ceil(ms / 1000));
      setRemaining(secs);
      if (secs <= 0 && onEnd) onEnd();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onEnd]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const isUrgent = remaining < 30;

  return (
    <span className={`font-mono text-sm font-bold ${isUrgent ? "text-destructive animate-pulse" : "text-white/60"}`}>
      {isUrgent && "☠️ "}{m}:{s.toString().padStart(2, "0")}
    </span>
  );
}

// Bottom persistent product card - Whatnot style
function ProductCard({ product, auction, onBuy, onBid, isWishlisted, onWishlist, variants: productVariants, selectedVariants, onVariantChange }: {
  product: LiveProduct;
  auction?: LiveAuction;
  onBuy: () => void;
  onBid: (amount: number) => void;
  isWishlisted?: boolean;
  onWishlist?: () => void;
  variants?: LiveProductVariant[];
  selectedVariants?: Record<string, string>;
  onVariantChange?: (label: string, option: string) => void;
}) {
  const [customBidOpen, setCustomBidOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const isAuction = product.type === "auction" && auction;
  const nextBid = isAuction ? (auction!.current_bid > 0 ? auction!.current_bid + 1 : auction!.starting_bid) : 0;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="rounded-t-2xl border-t border-x overflow-hidden"
      style={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--card))" }}
    >
      <div className="p-3">
        <div className="flex gap-3">
          {/* Product image */}
          <div className="relative w-20 h-20 flex-shrink-0">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="w-20 h-20 rounded-xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: "hsl(var(--card))" }}>🛍️</div>
            )}
            {onWishlist && (
              <button onClick={(e) => { e.stopPropagation(); onWishlist(); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-black/60"
                aria-label={isWishlisted ? "Remove from wishlist" : "Save for later"}>
                {isWishlisted ? "❤️" : "🤍"}
              </button>
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{product.title}</p>
            {product.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.description}</p>
            )}

            {isAuction ? (
              <div className="mt-1.5">
                {auction!.current_winner_username ? (
                  <p className="text-xs">
                    <span className="font-bold" style={{ color: "hsl(var(--primary))" }}>{auction!.current_winner_username}</span>
                    <span className="text-amber-400 ml-1 font-semibold">is winning!</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No bids yet</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <AuctionCountdown endsAt={auction!.ends_at} />
                  <span className="text-[10px] text-muted-foreground">{auction!.bid_count} bids</span>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-2">
                {product.quantity_remaining <= 5 && product.quantity_remaining > 0 && (
                  <span className="text-[10px] font-bold text-destructive">{product.quantity_remaining} left</span>
                )}
                <span className="text-xs text-muted-foreground">Shipping & Tax</span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex-shrink-0 text-right">
            <p className="text-lg font-bold text-white">
              ${isAuction ? (auction!.current_bid || auction!.starting_bid) : product.price}
            </p>
          </div>
        </div>

        {/* Variant picker */}
        {productVariants && productVariants.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {productVariants.map(v => (
              <div key={v.id}>
                <p className="text-[10px] text-white/40 mb-1">{v.label}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {v.options.map(opt => (
                    <button key={opt} onClick={() => onVariantChange?.(v.label, opt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        selectedVariants?.[v.label] === opt
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-white/20 bg-white/5 text-white/60"
                      }`}>{opt}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shipping info */}
        {(product.free_shipping || (product as any).shipping_price > 0 || ((product as any).condition && (product as any).condition !== "new")) && (
          <p className="text-[10px] text-white/40 mt-1.5">
            {product.free_shipping ? "✓ Free Shipping" : (product as any).shipping_price > 0 ? `+ $${(product as any).shipping_price} shipping` : ""}
            {(product as any).condition && (product as any).condition !== "new" ? ` · ${(product as any).condition.replace(/_/g, " ")}` : ""}
          </p>
        )}

        {/* Action buttons */}
        <div className="mt-3">
          {isAuction ? (
            <>
              {customBidOpen ? (
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-1 rounded-xl px-3" style={{ backgroundColor: "hsl(var(--card))" }}>
                    <span className="text-sm text-white/50">$</span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder={nextBid.toString()}
                      className="w-full bg-transparent text-sm text-white py-2.5 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button onClick={() => { onBid(parseFloat(customAmount) || nextBid); setCustomBidOpen(false); setCustomAmount(""); }}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: "hsl(var(--warning))", color: "hsl(var(--background))" }}>
                    Bid
                  </button>
                  <button onClick={() => setCustomBidOpen(false)}
                    className="px-3 py-2.5 rounded-xl text-sm text-white/50 border" style={{ borderColor: "hsl(var(--card))" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setCustomBidOpen(true)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white border" style={{ borderColor: "hsl(var(--secondary))" }}>
                    Custom
                  </button>
                  <button onClick={() => onBid(nextBid)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
                    style={{ backgroundColor: "hsl(var(--warning))", color: "hsl(var(--background))" }}>
                    Bid: ${nextBid} <span className="text-xs">»</span>
                  </button>
                </div>
              )}
              {(product as any).buy_now_price > 0 && (
                <button onClick={onBuy}
                  className="w-full mt-2 py-2 rounded-xl text-xs font-bold border border-white/20 text-white hover:bg-white/5 transition-colors">
                  Buy Now · ${(product as any).buy_now_price}
                </button>
              )}
            </>
          ) : product.is_sold_out ? (
            <button disabled className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#333] text-muted-foreground">
              Sold Out
            </button>
          ) : (
            <button onClick={onBuy}
              className="w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ backgroundColor: "hsl(var(--warning))", color: "hsl(var(--background))" }}>
              Buy Now · ${product.price}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Giveaway widget (top right)
function GiveawayWidget({ giveaway, onEnter, entered }: {
  giveaway: any;
  onEnter: () => void;
  entered: boolean;
}) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      onClick={onEnter}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{ backgroundColor: entered ? "rgba(0,255,133,0.15)" : "rgba(255,215,0,0.15)", backdropFilter: "blur(12px)" }}
    >
      <span className="text-base">🎁</span>
      <div className="text-left">
        <p className="text-[10px] font-bold" style={{ color: entered ? "hsl(var(--primary))" : "hsl(var(--warning))" }}>
          {entered ? "Entered ✓" : "Giveaway"}
        </p>
        <p className="text-[10px] text-white/60">{giveaway.entry_count} Entries</p>
      </div>
    </motion.button>
  );
}

// Winner overlay
function WinnerOverlay({ username, title, onDismiss }: { username: string; title: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(10,10,10,0.9)" }}
      onClick={onDismiss}
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>
        <p className="text-2xl font-black text-white mb-2">{username}</p>
        <p className="text-sm" style={{ color: "hsl(var(--warning))" }}>won the giveaway!</p>
        <p className="text-xs text-white/50 mt-1">{title}</p>
        {/* Confetti */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{ backgroundColor: i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "hsl(var(--warning))" : "hsl(var(--foreground))", left: "50%", top: "50%" }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400, opacity: 0 }}
            transition={{ duration: 2, delay: Math.random() * 0.3 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function ViewerShopOverlay({ streamId, creatorUserId }: Props) {
  const {
    activeProducts, products, auctions, activeGiveaway, giveawayEntered, giveaways,
    activeFlashSales, wishlistedIds, getVariantsForProduct,
    placeBid, buyProduct, enterGiveaway, toggleWishlist,
  } = useLiveShop(streamId);

  const [winnerOverlay, setWinnerOverlay] = useState<{ username: string; title: string } | null>(null);
  const [shopDrawerOpen, setShopDrawerOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, Record<string, string>>>({});

  // Watch for giveaway winner
  useEffect(() => {
    const justEnded = giveaways.find(g => g.status === "ended" && g.winner_username);
    if (justEnded && justEnded.winner_username) {
      setWinnerOverlay({ username: justEnded.winner_username, title: justEnded.title });
    }
  }, [giveaways]);

  const mainProduct = activeProducts[0];
  const mainAuction = mainProduct ? auctions.find(a => a.live_product_id === mainProduct.id && a.status === "active") : undefined;

  return (
    <>
      {/* Giveaway widget - top right */}
      <AnimatePresence>
        {activeGiveaway && (
          <div className="absolute top-14 right-3 z-40">
            <GiveawayWidget
              giveaway={activeGiveaway}
              onEnter={() => enterGiveaway(activeGiveaway.id)}
              entered={giveawayEntered}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Shop button in action bar */}
      {products.length > 0 && (
        <div className="absolute right-3 z-40" style={{ bottom: mainProduct ? "200px" : "80px" }}>
          <button
            onClick={() => setShopDrawerOpen(true)}
            className="w-11 h-11 rounded-full flex items-center justify-center relative"
            style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)" }}
          >
            <ShoppingBag className="w-5 h-5 text-white" />
            {activeProducts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ backgroundColor: "hsl(var(--destructive))", color: "white" }}>
                {activeProducts.length}
              </span>
            )}
          </button>
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/60 font-semibold">Shop</span>
        </div>
      )}

      {/* Bottom product card - persistent */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        {/* Flash sale banner */}
        {mainProduct && activeFlashSales?.filter(f => f.live_product_id === mainProduct.id).map(flash => (
          <div key={flash.id} className="mx-3 mb-1 rounded-xl p-2.5 border border-amber-500/40" style={{ backgroundColor: "rgba(245,158,11,0.15)", backdropFilter: "blur(12px)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-xs font-black text-amber-400">FLASH SALE — {flash.discount_percent}% OFF</p>
                  <p className="text-[10px] text-white/60">
                    <span className="line-through">${flash.original_price}</span>
                    {" → "}<span className="text-amber-400 font-bold">${flash.sale_price}</span>
                  </p>
                </div>
              </div>
              <FlashSaleCountdown endsAt={flash.ends_at} />
            </div>
          </div>
        ))}
        <AnimatePresence>
          {mainProduct && (
            <ProductCard
              product={mainProduct}
              auction={mainAuction}
              isWishlisted={wishlistedIds.has(mainProduct.id)}
              onWishlist={() => toggleWishlist(mainProduct.id)}
              variants={getVariantsForProduct(mainProduct.id)}
              selectedVariants={selectedVariants[mainProduct.id] || {}}
              onVariantChange={(label, opt) => setSelectedVariants(prev => ({
                ...prev,
                [mainProduct.id]: { ...(prev[mainProduct.id] || {}), [label]: opt }
              }))}
              onBuy={() => {
                const variantStr = Object.entries(selectedVariants[mainProduct.id] || {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ");
                buyProduct(mainProduct.id, variantStr || undefined);
              }}
              onBid={(amount) => placeBid(mainProduct.id, amount)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Shop drawer */}
      <Drawer.Root open={shopDrawerOpen} onOpenChange={setShopDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[90]" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[91] flex flex-col rounded-t-2xl outline-none"
            style={{ backgroundColor: "hsl(var(--background))", maxHeight: "70vh" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
            </div>
            <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: "hsl(var(--card))" }}>
              <span className="text-sm font-bold text-white">🛍️ Shop</span>
              <span className="text-[10px] text-white/40">{products.length} products</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {products.map(p => {
                const auction = auctions.find(a => a.live_product_id === p.id && a.status === "active");
                return (
                  <div key={p.id} className="rounded-xl p-3 flex items-center gap-3"
                    style={{ backgroundColor: p.is_active ? "rgba(0,255,133,0.05)" : "hsl(var(--background))", border: p.is_active ? "1px solid #00FF85" : "1px solid #1E1E1E" }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: "hsl(var(--card))" }}>🛍️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {p.is_active && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary">LIVE</span>}
                        <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.type === "auction" ? `Auction · Start $${p.starting_bid}` : `$${p.price}`}
                        {auction && ` · Current $${auction.current_bid}`}
                      </p>
                    </div>
                    {!p.is_active && !p.is_sold_out && (
                      <button onClick={() => { buyProduct(p.id); setShopDrawerOpen(false); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
                        style={{ backgroundColor: "hsl(var(--warning))", color: "hsl(var(--background))" }}>
                        {p.type === "auction" ? `Bid $${p.starting_bid}` : `$${p.price}`}
                      </button>
                    )}
                    {p.is_sold_out && <span className="text-[10px] text-white/30">Sold Out</span>}
                  </div>
                );
              })}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Winner overlay */}
      <AnimatePresence>
        {winnerOverlay && (
          <WinnerOverlay
            username={winnerOverlay.username}
            title={winnerOverlay.title}
            onDismiss={() => setWinnerOverlay(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
