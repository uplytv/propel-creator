import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Eye, Scissors, Trash2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SharePanel from "@/components/share/SharePanel";
import type { Clip } from "@/hooks/useClips";

interface Props {
  clips: Clip[];
  isOwner?: boolean;
  onDelete?: (id: string) => void;
  onPlay?: (clip: Clip) => void;
}

function formatDuration(seconds: number) {
  return `0:${seconds.toString().padStart(2, "0")}`;
}

export default function ClipsGrid({ clips, isOwner, onDelete, onPlay }: Props) {
  if (clips.length === 0) {
    return (
      <div className="text-center py-16">
        <Scissors className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">No clips yet</h3>
        <p className="text-sm text-muted-foreground">Create clips from live streams or recordings.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {clips.map((clip, i) => {
        const thumb = clip.clip_playback_id
          ? `https://image.mux.com/${clip.clip_playback_id}/thumbnail.png?width=320&height=560&time=2`
          : null;

        return (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl overflow-hidden border border-border bg-card group cursor-pointer"
            onClick={() => onPlay?.(clip)}
          >
            <div className="relative aspect-[9/16] bg-muted">
              {thumb ? (
                <img src={thumb} alt={clip.caption} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-primary/10 to-primary/5">
                  <Scissors className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
              </div>
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                {formatDuration(clip.duration_seconds)}
              </span>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px]">
                <Eye className="w-3 h-3" /> {clip.view_count}
              </div>
            </div>

            <div className="p-2.5">
              <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{clip.caption || "Untitled Clip"}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={clip.creator_avatar || undefined} />
                  <AvatarFallback className="text-[8px]">{clip.creator_name?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground truncate">{clip.creator_name}</span>
              </div>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-7"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(clip.id); }}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
