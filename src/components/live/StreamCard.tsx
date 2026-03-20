import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, Shield, TrendingUp, Zap, Crown, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { MockStream } from "@/data/mockStreams";
import BoostCampaignBuilder from "@/components/ads/BoostCampaignBuilder";

const tierIcons = [Shield, TrendingUp, Zap, Crown];
const tierColors: Record<number, string> = {
  1: "bg-muted text-muted-foreground",
  2: "bg-primary/10 text-primary",
  3: "bg-primary/15 text-primary",
  4: "bg-warning/10 text-warning",
};

function formatViewers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
}

export default function StreamCard({ stream, index = 0 }: { stream: MockStream; index?: number }) {
  const navigate = useNavigate();
  const TierIcon = tierIcons[stream.creatorTier - 1] || Shield;
  const [boostOpen, setBoostOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
        className="group"
      >
        {/* Thumbnail */}
        <div
          onClick={() => navigate(`/stream/${stream.id}`)}
          className={`relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br ${stream.thumbnailGradient} border border-border/50 group-hover:border-primary/30 transition-all duration-300 cursor-pointer`}
        >
          {/* Real Mux thumbnail or mock */}
          {stream.muxPlaybackId ? (
            <img
              src={`https://image.mux.com/${stream.muxPlaybackId}/thumbnail.png?width=640&height=360&time=1`}
              alt={stream.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-foreground/5 backdrop-blur-sm flex items-center justify-center">
                <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[20px] border-l-foreground/40 ml-1" />
              </div>
            </div>
          )}

          {/* LIVE badge */}
          {stream.isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="live-badge flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold">
                <span className="live-dot w-2 h-2 rounded-full" />
                LIVE
              </span>
              {(stream as any).hasShop && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold"
                  style={{ backgroundColor: "rgba(255,215,0,0.2)", color: "#FFD700", backdropFilter: "blur(8px)" }}>
                  🛍️
                </span>
              )}
            </div>
          )}

          {/* Viewer count */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/70 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-foreground">
            <Eye className="w-3 h-3" />
            {formatViewers(stream.viewers)}
          </div>

          {/* Category tag */}
          <div className="absolute bottom-3 left-3">
            <span className="bg-background/70 backdrop-blur-sm text-xs font-medium text-foreground px-2 py-1 rounded-md">
              {stream.category}
            </span>
          </div>

          {/* Boost button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={(e) => {
              e.stopPropagation();
              setBoostOpen(true);
            }}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-primary/90 hover:bg-primary backdrop-blur-sm text-primary-foreground px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all opacity-0 group-hover:opacity-100 sm:opacity-100"
            style={{ boxShadow: "var(--glow-shadow)" }}
          >
            <Rocket className="w-3 h-3" />
            Boost
          </motion.button>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>

        {/* Info */}
        <div className="mt-3 flex gap-3">
          {/* Avatar */}
          <div
            onClick={() => navigate(`/stream/${stream.id}`)}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary cursor-pointer"
          >
            {stream.creatorAvatar}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              onClick={() => navigate(`/stream/${stream.id}`)}
              className="text-sm font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
            >
              {stream.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{stream.creatorName}</span>
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tierColors[stream.creatorTier]}`}>
                <TierIcon className="w-2.5 h-2.5" />
                {stream.creatorTierName}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Started {stream.startedAt}</p>
          </div>
        </div>
      </motion.div>

      {/* Boost Campaign Builder Modal */}
      <BoostCampaignBuilder
        isOpen={boostOpen}
        onClose={() => setBoostOpen(false)}
        streamTitle={stream.title}
        creatorName={stream.creatorName}
      />
    </>
  );
}
