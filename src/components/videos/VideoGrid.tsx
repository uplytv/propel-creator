import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Eye, Clock, Film } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Video } from "@/hooks/useVideos";

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface VideoGridProps {
  videos: Video[];
  loading?: boolean;
  emptyMessage?: string;
}

export default function VideoGrid({ videos, loading, emptyMessage }: VideoGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden animate-pulse">
            <Skeleton className="aspect-video w-full" />
            <div className="p-3 space-y-2">
              <div className="flex gap-2.5">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return <EmptyState icon={Film} title="No videos yet" description={emptyMessage || "Videos will appear here once uploaded."} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((v, i) => (
        <VideoCard key={v.id} video={v} index={i} />
      ))}
    </div>
  );
}

function VideoCard({ video, index }: { video: Video; index: number }) {
  const navigate = useNavigate();

  const { data: creator } = useQuery({
    queryKey: ["video-card-creator", video.creator_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles_public")
        .select("display_name, username, avatar_url")
        .eq("user_id", video.creator_id)
        .maybeSingle();
      return data;
    },
    staleTime: 60000,
  });

  const creatorUsername = creator?.username || creator?.display_name || "creator";
  const thumb = video.playback_id
    ? `https://image.mux.com/${video.playback_id}/thumbnail.jpg?width=640&height=360&time=2`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => navigate(`/${encodeURIComponent(creatorUsername)}/videos/${video.slug}`)}
      className="group cursor-pointer rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 transition-all"
    >
      <div className="relative aspect-video bg-secondary overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Eye className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        {video.duration_seconds > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono">
            {formatDuration(video.duration_seconds)}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex gap-2.5">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/creator/${encodeURIComponent(creatorUsername)}`); }}
            className="shrink-0"
          >
            {creator?.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-border" loading="lazy" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-border">
                {(creator?.display_name || "C").charAt(0)}
              </div>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{video.title}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {creator?.display_name || "Creator"}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>{video.view_count.toLocaleString()} views</span>
              <span>·</span>
              <span>{timeAgo(video.created_at)}</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
