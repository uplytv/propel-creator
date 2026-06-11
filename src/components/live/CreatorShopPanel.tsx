import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Gift, Zap, ShoppingBag, Play, Square, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLiveShop, type LiveProduct, type LiveAuction } from "@/hooks/useLiveShop";
import { useEffect } from "react";

interface Props {
  streamId: string;
}

function AuctionCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const ms = new Date(endsAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const isUrgent = remaining < 30;

  return (
    <span className={`font-mono text-xs font-bold ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
      {isUrgent && "☠️ "}{m}:{s.toString().padStart(2, "0")}
    </span>
  );
}

export default function CreatorShopPanel({ streamId }: Props) {
  const {
    products, activeProducts, queuedProducts, auctions, giveaways,
    activeGiveaway, totalRevenue, unitsSold,
    activateProduct, deactivateProduct, startGiveaway, endGiveaway,
  } = useLiveShop(streamId);

  const [giveawayTitle, setGiveawayTitle] = useState("");
  const [showGiveawayForm, setShowGiveawayForm] = useState(false);

  const activeBidCount = auctions.filter(a => a.status === "active").reduce((s, a) => s + a.bid_count, 0);

  return (
    <div className="space-y-3 p-3">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Revenue", value: `$${totalRevenue.toFixed(0)}`, color: "hsl(var(--primary))" },
          { label: "Sold", value: unitsSold.toString(), color: "hsl(var(--warning))" },
          { label: "Bids", value: activeBidCount.toString(), color: "#FF9F43" },
          { label: "Products", value: products.length.toString(), color: "white" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active products */}
      {activeProducts.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Active</p>
          {activeProducts.map(p => {
            const auction = auctions.find(a => a.live_product_id === p.id && a.status === "active");
            return (
              <motion.div key={p.id} layout className="rounded-lg p-2.5 mb-1.5 border"
                style={{ backgroundColor: "rgba(61, 124, 255,0.05)", borderColor: "hsl(var(--primary))" }}>
                <div className="flex items-center gap-2">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} loading="lazy" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-sm">🛍️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{p.title}</p>
                    {auction ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: "hsl(var(--primary))" }}>
                          ${auction.current_bid} · {auction.current_winner_username || "No bids"}
                        </span>
                        <AuctionCountdown endsAt={auction.ends_at} />
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/50">${p.price} · {p.quantity_remaining} left</span>
                    )}
                  </div>
                  <button onClick={() => deactivateProduct(p.id)}
                    className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30">
                    End
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Queue */}
      {queuedProducts.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Queue</p>
          {queuedProducts.map(p => (
            <div key={p.id} className="rounded-lg p-2.5 mb-1.5 flex items-center gap-2"
              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.title} loading="lazy" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-sm">🛍️</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{p.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold uppercase ${
                    p.type === "auction" ? "bg-amber-500/10 text-amber-400" : "bg-primary/10 text-primary"
                  }`}>{p.type === "auction" ? "AUCTION" : "SELL"}</span>
                  <span className="text-[10px] text-white/40">
                    {p.type === "auction" ? `Start $${p.starting_bid}` : `$${p.price}`} · Qty: {p.quantity_total}
                  </span>
                </div>
              </div>
              <button onClick={() => activateProduct(p.id)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--background))" }}>
                Activate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Giveaway */}
      <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Giveaway</p>
        {activeGiveaway ? (
          <div className="rounded-lg p-2.5 border" style={{ backgroundColor: "rgba(255,215,0,0.05)", borderColor: "hsl(var(--warning))" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">🎁 {activeGiveaway.title}</p>
                <p className="text-[10px] text-amber-400 mt-0.5">{activeGiveaway.entry_count} entries</p>
              </div>
              <button onClick={() => endGiveaway(activeGiveaway.id)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
                <Trophy className="w-3 h-3 inline mr-0.5" /> Pick Winner
              </button>
            </div>
          </div>
        ) : showGiveawayForm ? (
          <div className="space-y-2">
            <input value={giveawayTitle} onChange={e => setGiveawayTitle(e.target.value)}
              placeholder="Giveaway title"
              className="w-full rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="flex gap-2">
              <button onClick={() => setShowGiveawayForm(false)}
                className="flex-1 py-1.5 rounded-lg text-xs text-white/50 border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button onClick={() => { startGiveaway(giveawayTitle); setGiveawayTitle(""); setShowGiveawayForm(false); }}
                disabled={!giveawayTitle.trim()}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                style={{ backgroundColor: "hsl(var(--warning))", color: "hsl(var(--background))" }}>
                🎁 Launch
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowGiveawayForm(true)}
            className="w-full py-2 rounded-lg text-xs font-semibold border border-dashed hover:border-amber-500/50 text-white/50 hover:text-amber-400 transition-all"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            <Gift className="w-3.5 h-3.5 inline mr-1" /> Start Giveaway
          </button>
        )}
      </div>
    </div>
  );
}
