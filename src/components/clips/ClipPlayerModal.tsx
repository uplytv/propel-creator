import { useState } from "react";
import { X, Eye, Clock, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SharePanel from "@/components/share/SharePanel";
import type { Clip } from "@/hooks/useClips";

interface Props {
  clip: Clip;
  onClose: () => void;
}

export default function ClipPlayerModal({ clip, onClose }: Props) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
        <div
          className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden bg-black"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              onClick={() => setShareOpen(true)}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {clip.clip_playback_id ? (
            <video
              src={`https://stream.mux.com/${clip.clip_playback_id}.m3u8`}
              poster={`https://image.mux.com/${clip.clip_playback_id}/thumbnail.png?width=540&height=960&time=1`}
              className="w-full aspect-[9/16] object-contain bg-black"
              autoPlay
              playsInline
              controls
              loop
            />
          ) : (
            <div className="w-full aspect-[9/16] flex items-center justify-center text-white/40">
              No playback available
            </div>
          )}

          <div className="p-4 bg-gradient-to-t from-black to-transparent absolute bottom-0 left-0 right-0">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={clip.creator_avatar || undefined} />
                <AvatarFallback className="text-[8px]">{clip.creator_name?.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="text-white text-xs font-semibold">{clip.creator_name}</span>
            </div>
            <p className="text-white text-sm">{clip.caption}</p>
            <div className="flex items-center gap-3 mt-2 text-white/50 text-[10px]">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {clip.view_count}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {clip.duration_seconds}s</span>
            </div>
          </div>
        </div>
      </div>

      <SharePanel
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        contentType="clip"
        contentId={clip.id}
        title={clip.caption || "Clip"}
        playbackId={clip.clip_playback_id}
        muxAssetId={clip.clip_asset_id}
      />
    </>
  );
}
