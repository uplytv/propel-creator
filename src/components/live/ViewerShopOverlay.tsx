import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Gift, X, Zap, Clock } from "lucide-react";
import { useLiveShop, type LiveProduct, type LiveAuction } from "@/hooks/useLiveShop";
import { supabase } from "@/integrations/supabase/client";
import { Drawer } from "vaul";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props { streamId: string; creatorUserId: string; }

function AuctionCountdown({ endsAt, onEnd }: { endsAt: string; onEnd?: () => void }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      const s = Math.max(0, Math.ceil(ms / 1000));
      setRemaining(s);
      if (s <= 0 && onEnd) onEnd();
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [endsAt, onEnd]);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const urgent = remaining < 30;
  return (
    <span className={`font-mono text-xs font-bold ${urgent ? "text-red-400" : "text-yellow-400"}`}>
      {urgent && "☠️ "}{m}:{s.toString().padStart(2, "0")}
    </span>
  );
}

function FlashSaleBanner({ flash, onBuy }: { flash: any; onBuy: () => void }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () => {
      const ms = new Date(flash.ends_at).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [flash.ends_at]);

  if (remaining <= 0) return null;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}>
      <div className="mx-3 mt-2 rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: "rgba(255,50,50,0.9)", backdropFilter: "blur(12px)" }}>
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold">⚡ Flash Sale</p>
          <p className="text-white/80 text-[11px] truncate">{flash.product_title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-white font-bold text-sm">${flash.sale_price}</span>
            <span className="text-white/50 line-through text-xs">${flash.original_price}</span>
            <span className="text-yellow-300 text-[10px] font-bold">{flash.discount_percent}% OFF</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-white font-mono text-sm font-bold">{m}:{s.toString().padStart(2, "0")}</span>
          <button onClick={onBuy} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
            Buy Now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ProductCard({ product, auction, onBuy, onBid }: { product: LiveProduct; auction?: LiveAuction; onBuy: () => void; onBid: (amount: number) => void }) {
  const [customBidOpen, setCustomBidOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const isAuction = product.type === "auction" && auction;
  const nextBid = isAuction ? (auction!.current_bid > 0 ? auction!.current_bid + 1 : auction!.starting_bid) : 0;

  return (
    <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", damping: 25 }}>
      <div className="mx-3 mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(10,10,10,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="p-3 flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "hsl(var(--card))" }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{product.title}</p>
            {product.description && <p className="text-white/50 text-xs truncate mt-0.5">{product.description}</p>}
            {isAuction ? (
              <div className="flex items-center gap-2 mt-1">
                {auction!.current_winner_username ? (
                  <span className="text-[10px] text-yellow-400 font-medium">{auction!.current_winner_username} winning!</span>
                ) : (
                  <span className="text-[10px] text-white/40">No bids yet</span>
                )}
                <span className="text-[10px] text-white/30">{auction!.bid_count} bids</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                {product.quantity_remaining <= 5 && product.quantity_remaining > 0 && (
                  <span className="text-[10px] text-red-400 font-semibold">{product.quantity_remaining} left</span>
                )}
              </div>
            )}
          </div>
          <span className="text-lg font-bold" style={{ color: "#00FF85" }}>
            ${isAuction ? (auction!.current_bid || auction!.starting_bid) : product.price}
          </span>
        </div>

        <div className="px-3 pb-3 flex gap-2">
          {isAuction ? (
            customBidOpen ? (
              <div className="flex gap-2 flex-1">
                <div className="flex-1 flex items-center rounded-xl px-3" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <span className="text-white/40 text-sm mr-1">$</span>
                  <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder={nextBid.toString()} style={{ fontSize: 16 }} className="w-full bg-transparent text-sm text-white py-2.5 focus:outline-none" autoFocus />
                </div>
                <button onClick={() => { onBid(parseFloat(customAmount) || nextBid); setCustomBidOpen(false); setCustomAmount(""); }} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: "hsl(var(--warning))", color: "hsl(var(--background))" }}>Bid</button>
                <button onClick={() => setCustomBidOpen(false)} className="px-3 py-2.5 rounded-xl text-sm text-white/50 border" style={{ borderColor: "hsl(var(--card))" }}>✕</button>
              </div>
            ) : (
              <div className="flex gap-2 flex-1">
                <button onClick={() => setCustomBidOpen(true)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white border" style={{ borderColor: "hsl(var(--secondary))" }}>Custom</button>
                <button onClick={() => onBid(nextBid)} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1" style={{ backgroundColor: "hsl(var(--warning))", color: "hsl(var(--background))" }}>Bid ${nextBid} »</button>
              </div>
            )
          ) : product.is_sold_out ? (
            <span className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center text-white/30 bg-white/5">Sold Out</span>
          ) : (
            <button onClick={onBuy} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
              Buy Now · ${product.price}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function GiveawayWidget({ giveaway, onEnter, entered }: { giveaway: any; onEnter: () => void; entered: boolean }) {
  return (
    <div className="mx-3 mt-2 rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: "rgba(139,92,246,0.85)", backdropFilter: "blur(12px)" }}>
      <span className="text-lg">🎁</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-bold">GIVEAWAY</p>
        <p className="text-white/80 text-[11px] truncate">{giveaway.title}</p>
      </div>
      <button onClick={onEnter} disabled={entered} className="px-4 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: entered ? "rgba(255,255,255,0.2)" : "#00FF85", color: entered ? "white" : "#0A0A0A" }}>
        {entered ? "✓ Entered" : "Enter"}
      </button>
    </div>
  );
}

export default function ViewerShopOverlay({ streamId, creatorUserId }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeProducts, products, auctions, activeGiveaway, giveawayEntered, giveaways, placeBid, buyProduct, enterGiveaway } = useLiveShop(streamId);
  const [shopDrawerOpen, setShopDrawerOpen] = useState(false);
  const [winnerOverlay, setWinnerOverlay] = useState<{ username: string; title: string } | null>(null);
  const [flashSale, setFlashSale] = useState<any>(null);

  // Watch for giveaway winners
  useEffect(() => {
    const ended = giveaways.find((g: any) => g.status === "ended" && g.winner_username);
    if (ended?.winner_username) setWinnerOverlay({ username: ended.winner_username, title: ended.title });
  }, [giveaways]);

  // Real-time flash sale subscription — LIVE ONLY
  useEffect(() => {
    if (!streamId) return;
    const loadFlash = async () => {
      const { data } = await (supabase as any)
        .from("live_flash_sales")
        .select("*, live_products(title)")
        .eq("stream_id", streamId)
        .eq("is_active", true)
        .gte("ends_at", new Date().toISOString())
        .maybeSingle();
      if (data) setFlashSale({ ...data, product_title: data.live_products?.title });
    };
    loadFlash();

    const channel = supabase.channel(`flash-${streamId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_flash_sales", filter: `stream_id=eq.${streamId}` },
        async (payload: any) => {
          const { data: prod } = await supabase.from("live_products").select("title").eq("id", payload.new.live_product_id).maybeSingle();
          setFlashSale({ ...payload.new, product_title: (prod as any)?.title });
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_flash_sales", filter: `stream_id=eq.${streamId}` },
        (payload: any) => { if (!payload.new.is_active) setFlashSale(null); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const handleFlashBuy = async () => {
    if (!flashSale) return;
    if (!user) { navigate("/auth"); return; }
    const { data, error } = await supabase.functions.invoke("stripe-create-live-purchase", { body: { live_product_id: flashSale.live_product_id } });
    if (error || !data?.url) { toast.error("Couldn't start checkout"); return; }
    window.location.href = data.url;
  };

  const mainProduct = activeProducts[0];
  const mainAuction = mainProduct ? auctions.find((a: any) => a.live_product_id === mainProduct.id && a.status === "active") : undefined;

  return (
    <>
      {/* Flash Sale Banner — LIVE only, real-time */}
      <AnimatePresence>
        {flashSale && <FlashSaleBanner flash={flashSale} onBuy={handleFlashBuy} />}
      </AnimatePresence>

      {/* Giveaway widget */}
      <AnimatePresence>
        {activeGiveaway && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}>
            <GiveawayWidget giveaway={activeGiveaway} onEnter={() => enterGiveaway(activeGiveaway.id)} entered={giveawayEntered} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shop button */}
      {products.length > 0 && (
        <div className="absolute bottom-24 right-3 flex flex-col items-center gap-1 z-30">
          <button
            onClick={() => setShopDrawerOpen(true)}
            aria-label="Open live shop"
            className="w-12 h-12 rounded-full flex items-center justify-center relative"
            style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)" }}>
            <ShoppingBag className="w-5 h-5 text-white" />
            {activeProducts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
                {activeProducts.length}
              </span>
            )}
          </button>
          <span className="text-[10px] text-white/60">{products.length} {products.length === 1 ? "item" : "items"}</span>
        </div>
      )}

      {/* Bottom product card — Whatnot style */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatePresence>
            {mainProduct && (
              <ProductCard
                product={mainProduct}
                auction={mainAuction}
                onBuy={() => buyProduct(mainProduct.id)}
                onBid={(amount) => placeBid(mainProduct.id, amount)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Shop drawer */}
      <Drawer.Root open={shopDrawerOpen} onOpenChange={setShopDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] rounded-t-2xl" style={{ backgroundColor: "hsl(var(--background))" }}>
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />

            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-white font-bold">🛍️ Live Shop</span>
              <span className="text-white/40 text-xs">{products.length} products</span>
            </div>

            <div className="px-4 pb-6 overflow-y-auto max-h-[60vh] space-y-2">
              {products.map((p: LiveProduct) => {
                const auc = auctions.find((a: any) => a.live_product_id === p.id && a.status === "active");
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} loading="lazy" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-lg">🛍️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {p.is_active && <span className="text-[10px] mr-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">LIVE</span>}
                        {p.title}
                      </p>
                      <p className="text-white/40 text-xs">
                        {p.type === "auction" ? `Auction · Start $${p.starting_bid}` : `$${p.price}`}
                        {auc && ` · Bid $${auc.current_bid}`}
                      </p>
                    </div>
                    {p.is_active && !p.is_sold_out ? (
                      p.type === "auction" && auc ? (
                        <button onClick={() => { setShopDrawerOpen(false); }} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "hsl(var(--warning))", color: "#0A0A0A" }}>Bid</button>
                      ) : (
                        <button onClick={() => { buyProduct(p.id); setShopDrawerOpen(false); }} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>Buy</button>
                      )
                    ) : p.is_sold_out ? (
                      <span className="text-white/30 text-xs">Sold Out</span>
                    ) : (
                      <span className="text-white/30 text-xs">Upcoming</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Giveaway winner overlay */}
      <AnimatePresence>
        {winnerOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={() => setWinnerOverlay(null)}>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center p-8 rounded-2xl" style={{ backgroundColor: "rgba(139,92,246,0.95)" }}>
              <p className="text-5xl mb-4">🎉</p>
              <p className="text-white text-2xl font-bold">{winnerOverlay.username}</p>
              <p className="text-white/70 text-sm mt-1">won the giveaway!</p>
              <p className="text-white/50 text-xs mt-2">{winnerOverlay.title}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
