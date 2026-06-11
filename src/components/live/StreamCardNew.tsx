import { memo } from "react";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface StreamCardData {
  id: string;
  creatorName: string;
  creatorAvatar: string;
  creatorTier: number;
  creatorTierName: string;
  title: string;
  category: string;
  viewers: number;
  isLive: boolean;
  isPublic: boolean;
  thumbnailGradient: string;
  communityPrice: number;
  startedAt: string;
  description: string;
  muxPlaybackId?: string | null;
}

function formatViewers(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
}

const StreamCardNew = memo(function StreamCardNew({ stream, index = 0 }: { stream: StreamCardData; index?: number }) {
  const navigate = useNavigate();

  const thumbnailUrl = stream.muxPlaybackId
    ? `https://image.mux.com/${stream.muxPlaybackId}/thumbnail.jpg?time=0`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
      className="group cursor-pointer"
      onClick={() => navigate(`/stream/${stream.id}`)}
      role="article"
      aria-label={`${stream.title} by ${stream.creatorName}`}
    >
      {/* Thumbnail 16:9 */}
      <div className="relative aspect-video rounded-lg overflow-hidden bg-card border-2 border-transparent group-hover:border-primary transition-all duration-200 group-hover:scale-[1.02]">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={stream.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-secondary">
            <img src="/logo.png" alt="UPLY" loading="lazy" className="h-6 opacity-30" />
          </div>
        )}

        {/* LIVE badge top-left */}
        {stream.isLive && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold text-white bg-destructive">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
        )}

        {/* Viewer count bottom-left */}
        <div className="absolute bottom-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-foreground bg-background/60 backdrop-blur-sm">
            <Eye className="w-3 h-3" />
            {formatViewers(stream.viewers)} watching
          </span>
        </div>
      </div>

      {/* Info below thumbnail */}
      <div className="mt-2.5 flex gap-2.5">
        {/* Creator avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-[11px] font-bold text-muted-foreground overflow-hidden">
          {stream.creatorAvatar && stream.creatorAvatar.startsWith('http') ? (
            <img src={stream.creatorAvatar} alt={`${stream.creatorName}'s avatar`} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            stream.creatorAvatar || stream.creatorName.slice(0, 2).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Creator name */}
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {stream.creatorName}
          </p>
          {/* Stream title */}
          <p className="text-sm text-muted-foreground truncate leading-snug mt-0.5">
            {stream.title}
          </p>
          {/* Category tag */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground">
              {stream.category}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

StreamCardNew.displayName = "StreamCardNew";

export default StreamCardNew;
