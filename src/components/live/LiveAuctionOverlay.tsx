import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gavel, Timer, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LiveAuction } from "@/hooks/useLiveAuction";

interface LiveAuctionOverlayProps {
  auction: LiveAuction | null;
  isHost: boolean;
  onBid: (amount: number) => void;
  onEnd: () => void;
  onCancel: () => void;
  bidHistory: Array<{ name: string; amount: number; time: number }>;
}

export default function LiveAuctionOverlay({
  auction,
  isHost,
  onBid,
  onEnd,
  onCancel,
  bidHistory,
}: LiveAuctionOverlayProps) {
  const [bidAmount, setBidAmount] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!auction || auction.status !== 'active') return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((auction.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 250);
    return () => clearInterval(interval);
  }, [auction]);

  if (!auction || auction.status === 'cancelled') return null;

  const isUrgent = timeLeft < 30 && auction.status === 'active';
  const minBid = auction.currentBid + 1;

  const quickBids = [
    minBid,
    Math.ceil(auction.currentBid * 1.1),
    Math.ceil(auction.currentBid * 1.25),
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={`absolute bottom-20 left-3 right-3 z-30 rounded-xl border p-3 backdrop-blur-md ${
          isUrgent
            ? 'bg-destructive/10 border-destructive/30'
            : 'bg-background/95 border-border'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Gavel className={`w-4 h-4 ${isUrgent ? 'text-destructive animate-pulse' : 'text-primary'}`} />
          <span className="text-xs font-bold text-foreground flex-1 truncate">
            {auction.itemName}
          </span>
          <div className={`flex items-center gap-1 text-xs font-mono ${
            isUrgent ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            <Timer className="w-3 h-3" />
            {auction.status === 'active' ? (
              <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            ) : (
              <span className="text-primary font-bold">SOLD!</span>
            )}
          </div>
        </div>

        {/* Current bid */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Bid</p>
            <p className="text-lg font-bold text-foreground">${auction.currentBid}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">
              {auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}
            </p>
            {auction.currentBidderName && (
              <p className="text-xs text-primary font-semibold truncate max-w-[120px]">
                👤 {auction.currentBidderName}
              </p>
            )}
          </div>
        </div>

        {/* Urgent warning */}
        {isUrgent && auction.status === 'active' && (
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="flex items-center gap-1 text-[10px] text-destructive mb-2"
          >
            <AlertTriangle className="w-3 h-3" /> Ending soon! ☠️
          </motion.div>
        )}

        {/* Bidding controls (viewer) */}
        {!isHost && auction.status === 'active' && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {quickBids.map(amount => (
                <Button
                  key={amount}
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-[10px]"
                  onClick={() => onBid(amount)}
                >
                  ${amount}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                type="number"
                min={minBid}
                placeholder={`$${minBid}+`}
                className="h-7 text-xs"
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
              />
              <Button
                size="sm"
                className="h-7 text-[10px] px-4"
                onClick={() => {
                  const amt = Number(bidAmount);
                  if (amt >= minBid) { onBid(amt); setBidAmount(""); }
                }}
              >
                Bid
              </Button>
            </div>
          </div>
        )}

        {/* Host controls */}
        {isHost && auction.status === 'active' && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="destructive" className="flex-1 h-7 text-[10px]" onClick={onEnd}>
              End Auction
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}

        {/* Sold state */}
        {auction.status === 'sold' && auction.currentBidderName && (
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-center py-2"
          >
            <p className="text-xs font-bold text-primary">
              🎉 Won by {auction.currentBidderName} for ${auction.currentBid}!
            </p>
          </motion.div>
        )}

        {/* Bid history ticker */}
        {bidHistory.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border max-h-16 overflow-y-auto">
            {bidHistory.slice(0, 3).map((bid, i) => (
              <p key={i} className="text-[9px] text-muted-foreground">
                <TrendingUp className="w-2.5 h-2.5 inline mr-1" />
                {bid.name} bid ${bid.amount}
              </p>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
