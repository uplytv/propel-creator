import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Heart, Share2, Users, Shield, TrendingUp, Zap, Crown, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import StreamChat from "@/components/live/StreamChat";
import JoinOverlay from "@/components/live/JoinOverlay";
import { mockStreams } from "@/data/mockStreams";
import { useState } from "react";

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

export default function Stream() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [joinOpen, setJoinOpen] = useState(false);
  const [liked, setLiked] = useState(false);

  const stream = mockStreams.find((s) => s.id === id);
  if (!stream) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Stream not found</h1>
          <Button variant="outline" onClick={() => navigate("/live")}>Browse Streams</Button>
        </div>
      </div>
    );
  }

  const TierIcon = tierIcons[stream.creatorTier - 1] || Shield;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => navigate("/live")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="live-badge flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold">
              <span className="live-dot w-2 h-2 rounded-full" />
              LIVE
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              {formatViewers(stream.viewers)} watching
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`p-2 rounded-lg transition-colors ${liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            </button>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex pt-14">
        {/* Video area */}
        <div className="flex-1 flex flex-col">
          {/* Video player mock */}
          <div className={`relative aspect-video w-full bg-gradient-to-br ${stream.thumbnailGradient} flex items-center justify-center`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 rounded-full bg-foreground/5 backdrop-blur-sm flex items-center justify-center"
              >
                <Radio className="w-10 h-10 text-foreground/30" />
              </motion.div>
            </div>

            {/* Persistent Join CTA - bottom of video */}
            {stream.isPublic && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/95 via-background/60 to-transparent"
              >
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary border border-primary/30">
                      {stream.creatorAvatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Join {stream.creatorName}'s community
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Get full access to all streams, courses & resources
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={() => setJoinOpen(true)}
                    className="flex-shrink-0"
                  >
                    Join — ${stream.communityPrice}/mo
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Stream info */}
          <div className="px-6 py-5 border-b border-border">
            <h1 className="text-xl font-bold text-foreground mb-3">{stream.title}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {stream.creatorAvatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{stream.creatorName}</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tierColors[stream.creatorTier]}`}>
                      <TierIcon className="w-2.5 h-2.5" />
                      {stream.creatorTierName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{stream.category} · Started {stream.startedAt}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">{stream.description}</p>
          </div>
        </div>

        {/* Chat sidebar - desktop */}
        <div className="hidden lg:block w-80 flex-shrink-0">
          <div className="fixed top-14 right-0 w-80 bottom-0">
            <StreamChat isLoggedIn={!!user} />
          </div>
        </div>
      </div>

      {/* Join Overlay */}
      <JoinOverlay
        isOpen={joinOpen}
        onClose={() => setJoinOpen(false)}
        creatorName={stream.creatorName}
        creatorAvatar={stream.creatorAvatar}
        communityPrice={stream.communityPrice}
        category={stream.category}
      />
    </div>
  );
}
