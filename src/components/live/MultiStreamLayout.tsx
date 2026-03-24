import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Grid2X2, X, Plus, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import WebRTCPlayer from "./WebRTCPlayer";
import UPLYMuxPlayer from "@/components/MuxPlayer";

interface StreamSlot {
  id: string;
  streamId: string;
  playbackId: string;
  title: string;
  creatorName: string;
  streamType: "browser" | "mux";
  muted: boolean;
}

interface MultiStreamLayoutProps {
  primaryStream: StreamSlot;
  onClose: () => void;
}

export default function MultiStreamLayout({ primaryStream, onClose }: MultiStreamLayoutProps) {
  const [streams, setStreams] = useState<StreamSlot[]>([{ ...primaryStream, muted: false }]);
  const [layout, setLayout] = useState<"2x1" | "2x2" | "1+3">("2x1");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [addingStream, setAddingStream] = useState(false);

  const maxSlots = layout === "2x1" ? 2 : 4;

  const removeStream = (index: number) => {
    if (streams.length <= 1) {
      onClose();
      return;
    }
    setStreams((prev) => prev.filter((_, i) => i !== index));
    if (focusedIndex === index) setFocusedIndex(null);
  };

  const toggleMute = (index: number) => {
    setStreams((prev) =>
      prev.map((s, i) => (i === index ? { ...s, muted: !s.muted } : { ...s, muted: true }))
    );
  };

  const getGridClass = () => {
    if (focusedIndex !== null) return "grid-cols-1 grid-rows-1";
    switch (streams.length) {
      case 1: return "grid-cols-1 grid-rows-1";
      case 2: return "grid-cols-2 grid-rows-1";
      case 3: return "grid-cols-2 grid-rows-2";
      case 4: return "grid-cols-2 grid-rows-2";
      default: return "grid-cols-2 grid-rows-2";
    }
  };

  const visibleStreams = focusedIndex !== null ? [streams[focusedIndex]] : streams;

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/80 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Grid2X2 className="w-4 h-4 text-white/60" />
          <span className="text-xs font-semibold text-white">Multi-Stream ({streams.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Layout selector */}
          <div className="flex gap-1">
            {(["2x1", "2x2"] as const).map((l) => (
              <button
                key={l}
                onClick={() => { setLayout(l); setFocusedIndex(null); }}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                  layout === l ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stream grid */}
      <div className={`flex-1 grid ${getGridClass()} gap-0.5`}>
        {visibleStreams.map((stream, i) => {
          const actualIndex = focusedIndex !== null ? focusedIndex : i;
          return (
            <div key={stream.id} className="relative bg-black overflow-hidden group">
              {stream.streamType === "browser" ? (
                <WebRTCPlayer
                  streamId={stream.streamId}
                  playbackId={stream.playbackId}
                  title={stream.title}
                />
              ) : (
                <UPLYMuxPlayer
                  playbackId={stream.playbackId}
                  title={stream.title}
                  autoPlay
                  muted={stream.muted}
                  streamType="ll-live"
                />
              )}

              {/* Stream overlay controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold text-white truncate">{stream.title}</p>
                    <p className="text-[10px] text-white/60">{stream.creatorName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleMute(actualIndex)}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                      {stream.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setFocusedIndex(focusedIndex === actualIndex ? null : actualIndex)}
                      className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
                    >
                      {focusedIndex === actualIndex ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                    </button>
                    {streams.length > 1 && (
                      <button
                        onClick={() => removeStream(actualIndex)}
                        className="p-1.5 rounded-lg bg-red-500/50 hover:bg-red-500/70 text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add stream slot */}
        {streams.length < maxSlots && focusedIndex === null && (
          <button
            onClick={() => setAddingStream(true)}
            className="flex items-center justify-center border border-dashed border-white/20 hover:border-white/40 transition-colors"
          >
            <div className="text-center">
              <Plus className="w-8 h-8 text-white/30 mx-auto mb-2" />
              <p className="text-xs text-white/40">Add Stream</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// Button to enter multi-stream mode
export function MultiStreamButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      title="Watch multiple streams"
    >
      <Grid2X2 className="w-4 h-4" />
    </button>
  );
}
