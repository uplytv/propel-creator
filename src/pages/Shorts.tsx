import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, ChevronUp, ChevronDown, Play, Volume2, VolumeX, Scissors, Copy, Check } from "lucide-react";
import SharePanel from "@/components/share/SharePanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useShorts, Short } from "@/hooks/useShorts";
import { useClipLikes } from "@/hooks/useClipLikes";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";

export default function Shorts() {
  const { shorts, loading, hasMore, loadMore } = useShorts(8);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { likedClips, toggleLike: toggleClipLike, fetchLikeStatus, getLikeCount, isLiked } = useClipLikes();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [localLiked, setLocalLiked] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const currentShort = shorts[currentIndex];

  // Fetch like statuses when shorts load
  useEffect(() => {
    if (shorts.length > 0) {
      const clipIds = shorts.filter(s => s.source === "clip").map(s => s.id);
      if (clipIds.length > 0) fetchLikeStatus(clipIds);
    }
  }, [shorts.length]);

  // Autoplay current, pause others
  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (idx === currentIndex) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [currentIndex, shorts.length]);

  // Preload next batch
  useEffect(() => {
    if (currentIndex >= shorts.length - 3 && hasMore) {
      loadMore();
    }
  }, [currentIndex, shorts.length, hasMore]);

  const goNext = useCallback(() => {
    if (currentIndex < shorts.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, shorts.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  // Touch/swipe handling with velocity detection
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    const elapsed = Date.now() - touchStartTime.current;
    const velocity = Math.abs(diff) / elapsed;
    // Lower threshold for fast swipes (flicks)
    const threshold = velocity > 0.5 ? 30 : 60;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goNext();
      if (e.key === "ArrowUp" || e.key === "k") goPrev();
      if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const handleLike = (short: Short) => {
    if (short.source === "clip") {
      toggleClipLike(short.id);
    } else {
      setLocalLiked((prev) => {
        const next = new Set(prev);
        if (next.has(short.id)) next.delete(short.id);
        else next.add(short.id);
        return next;
      });
    }
  };

  const isShortLiked = (short: Short) => {
    if (short.source === "clip") return isLiked(short.id);
    return localLiked.has(short.id);
  };

  const getShortLikeCount = (short: Short) => {
    if (short.source === "clip") return getLikeCount(short.id);
    return short.like_count + (localLiked.has(short.id) ? 1 : 0);
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  if (loading && shorts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white">
        <Scissors className="w-12 h-12 mb-4 text-muted-foreground" />
        <h2 className="text-xl font-bold mb-2">No shorts yet</h2>
        <p className="text-sm text-white/60">Clips from live streams will appear here.</p>
        <button onClick={() => navigate(-1)} className="mt-6 px-4 py-2 rounded-lg bg-primary text-foreground text-sm font-bold hover:brightness-110 transition">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <SEOHead title="Shorts" description="Watch short-form creator clips on Uply." />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-50 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-white text-sm font-medium hover:bg-black/60 transition"
      >
        ← Back
      </button>

      {/* Mute toggle */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition"
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Video feed */}
      <AnimatePresence mode="wait">
        {currentShort && (
          <motion.div
            key={currentShort.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {currentShort.playback_id ? (
              <video
                ref={(el) => { if (el) videoRefs.current.set(currentIndex, el); }}
                src={`https://stream.mux.com/${currentShort.playback_id}.m3u8`}
                poster={`https://image.mux.com/${currentShort.playback_id}/thumbnail.png?width=720&height=1280&time=1`}
                className="w-full h-full object-contain"
                loop
                playsInline
                muted={muted}
                autoPlay
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-16 h-16 text-white/20" />
              </div>
            )}

            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

            {/* Source badge */}
            {currentShort.source === "clip" && (
              <div className="absolute top-16 left-4 z-10 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-primary bg-primary/10 border border-primary/30">
                <Scissors className="w-3 h-3" /> CLIP
              </div>
            )}

            {/* Creator info + caption */}
            <div className="absolute bottom-20 left-4 right-20 z-10">
              <div
                className="flex items-center gap-2.5 mb-3 cursor-pointer"
                onClick={() => navigate(`/creator/${currentShort.creator_id}`)}
              >
                <Avatar className="w-10 h-10 border-2 border-white/30">
                  <AvatarImage src={currentShort.creator_avatar || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {currentShort.creator_name?.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white text-sm font-bold">{currentShort.creator_name}</p>
                  {currentShort.creator_type_tag && (
                    <p className="text-white/50 text-[10px]">{currentShort.creator_type_tag}</p>
                  )}
                </div>
              </div>
              <p className="text-white text-sm leading-relaxed line-clamp-3">{currentShort.caption}</p>
            </div>

            {/* Right action bar */}
            <div className="absolute right-3 bottom-28 flex flex-col items-center gap-6 z-10">
              <button
                onClick={() => handleLike(currentShort)}
                className="flex flex-col items-center gap-1"
              >
                <Heart
                  className={`w-7 h-7 transition-all ${isShortLiked(currentShort) ? "text-red-500 fill-red-500 scale-110" : "text-white"}`}
                />
                <span className="text-white text-[10px] font-semibold">
                  {getShortLikeCount(currentShort)}
                </span>
              </button>
              <button className="flex flex-col items-center gap-1">
                <MessageCircle className="w-7 h-7 text-white" />
                <span className="text-white text-[10px] font-semibold">0</span>
              </button>
              <button onClick={handleShare} className="flex flex-col items-center gap-1">
                {copied ? <Check className="w-7 h-7 text-primary" /> : <Share2 className="w-7 h-7 text-white" />}
                <span className="text-white text-[10px] font-semibold">{copied ? "Copied" : "Share"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation arrows (desktop) */}
      <div className="hidden md:flex fixed right-16 top-1/2 -translate-y-1/2 flex-col gap-2 z-50">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex >= shorts.length - 1}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-40 md:hidden">
        {shorts.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((s, i) => {
          const realIdx = Math.max(0, currentIndex - 3) + i;
          return (
            <div
              key={s.id}
              className={`w-1 rounded-full transition-all ${realIdx === currentIndex ? "h-4 bg-primary" : "h-1.5 bg-white/30"}`}
            />
          );
        })}
      </div>

      {currentShort && (
        <SharePanel
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          contentType="clip"
          contentId={currentShort.id}
          title={currentShort.caption || "Short"}
          playbackId={currentShort.playback_id}
          creatorUsername={currentShort.creator_name}
        />
      )}
    </div>
  );
}
