import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Clock, Eye, Trash2, Globe, Lock, Film, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import SharePanel from "@/components/share/SharePanel";
import type { StreamRecording } from "@/hooks/useStreamRecordings";

interface Props {
  recordings: StreamRecording[];
  isOwner?: boolean;
  onTogglePublish?: (id: string, current: boolean) => void;
  onDelete?: (id: string) => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RecordingsGrid({ recordings, isOwner, onTogglePublish, onDelete }: Props) {
  const navigate = useNavigate();

  if (recordings.length === 0) {
    return (
      <div className="text-center py-16">
        <Film className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">No recordings yet</h3>
        <p className="text-sm text-muted-foreground">Completed live streams will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recordings.map((rec, i) => {
        const thumb = rec.playback_id
          ? `https://image.mux.com/${rec.playback_id}/thumbnail.png?width=640&height=360&time=5`
          : null;

        return (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card overflow-hidden group"
          >
            <div
              className="relative aspect-video bg-muted cursor-pointer"
              onClick={() => navigate(`/stream/${rec.id}?type=recording`)}
            >
              {thumb ? (
                <img src={thumb} alt={rec.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {rec.duration_seconds > 0 && (
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                  {formatDuration(rec.duration_seconds)}
                </span>
              )}
            </div>

            <div className="p-3">
              <h3 className="font-semibold text-sm text-foreground truncate">{rec.title || "Untitled Recording"}</h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {rec.view_count}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(rec.created_at).toLocaleDateString()}
                </span>
              </div>

              {isOwner && (
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1"
                    onClick={() => onTogglePublish?.(rec.id, rec.is_published)}
                  >
                    {rec.is_published ? <><Lock className="w-3 h-3" /> Unpublish</> : <><Globe className="w-3 h-3" /> Publish</>}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete?.(rec.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
