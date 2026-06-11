import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Scissors, Loader2, Share2, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/siteUrl";

interface ClipCreatorProps {
  sourceAssetId: string;
  creatorId: string;
  duration: number; // total VOD duration in seconds
  playbackId: string;
}

export default function ClipCreator({ sourceAssetId, creatorId, duration, playbackId }: ClipCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(30, duration));
  const [caption, setCaption] = useState("");
  const [creating, setCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | null>(null);

  const clipDuration = endTime - startTime;
  const isValid = clipDuration >= 5 && clipDuration <= 60;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const getPositionFromEvent = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * duration);
  }, [duration]);

  const handlePointerDown = (handle: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = handle;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const pos = getPositionFromEvent(e.clientX);
    if (dragging.current === "start") {
      setStartTime(Math.min(pos, endTime - 5));
    } else {
      setEndTime(Math.max(pos, startTime + 5));
    }
  };

  const handlePointerUp = () => {
    dragging.current = null;
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-clip", {
        body: {
          source_asset_id: sourceAssetId,
          start_time: startTime,
          end_time: endTime,
          caption: caption || `Clip ${formatTime(startTime)} - ${formatTime(endTime)}`,
          creator_id: creatorId,
        },
      });

      if (error) throw error;

      const clipId = data?.clip?.id;
      setShareUrl(`${SITE_URL}/shorts`);
      toast.success("Clip created! ✂️", { description: "Your clip is being processed by Mux." });
    } catch (err: any) {
      toast.error("Failed to create clip", { description: err.message || "Something went wrong" });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-white/10 text-sm font-medium text-white hover:border-primary/40 hover:text-primary transition-all"
      >
        <Scissors className="w-4 h-4" />
        Create Clip
      </button>
    );
  }

  // Share modal after creation
  if (shareUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-background border border-white/10"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" /> Clip Created!
          </h3>
          <button onClick={() => { setShareUrl(null); setIsOpen(false); setCaption(""); }} aria-label="Close" className="text-muted-foreground hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Your clip is processing. Share it now:</p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/5 text-xs text-muted-foreground truncate">
            {shareUrl}
          </div>
          <Button size="sm" onClick={handleCopy} className="bg-primary text-foreground font-bold hover:brightness-110 border-0">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-background border border-white/10"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Scissors className="w-4 h-4 text-primary" /> Create Clip
        </h3>
        <button onClick={() => setIsOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline track */}
      <div
        ref={trackRef}
        className="relative h-10 rounded-lg bg-background border border-white/5 cursor-crosshair select-none mb-3"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Thumbnail strip preview */}
        <div className="absolute inset-0 flex overflow-hidden rounded-lg opacity-30">
          {Array.from({ length: 10 }).map((_, i) => {
            const time = Math.floor((duration / 10) * i);
            return (
              <img
                key={i}
                src={`https://image.mux.com/${playbackId}/thumbnail.png?width=120&height=40&time=${time}`}
                alt=""
                className="h-full flex-1 object-cover"
                loading="lazy"
              />
            );
          })}
        </div>

        {/* Selected range highlight */}
        <div
          className="absolute top-0 bottom-0 bg-primary/20 border-y-2 border-primary/50"
          style={{
            left: `${(startTime / duration) * 100}%`,
            width: `${((endTime - startTime) / duration) * 100}%`,
          }}
        />

        {/* Start handle */}
        <div
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-10 group"
          style={{ left: `calc(${(startTime / duration) * 100}% - 6px)` }}
          onPointerDown={handlePointerDown("start")}
        >
          <div className="w-full h-full rounded-l bg-primary group-hover:bg-primary/80 transition-colors flex items-center justify-center">
            <div className="w-0.5 h-4 bg-background rounded" />
          </div>
        </div>

        {/* End handle */}
        <div
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-10 group"
          style={{ left: `calc(${(endTime / duration) * 100}% - 6px)` }}
          onPointerDown={handlePointerDown("end")}
        >
          <div className="w-full h-full rounded-r bg-primary group-hover:bg-primary/80 transition-colors flex items-center justify-center">
            <div className="w-0.5 h-4 bg-background rounded" />
          </div>
        </div>
      </div>

      {/* Time labels */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
        <span>{formatTime(startTime)}</span>
        <span className={`font-semibold ${isValid ? "text-primary" : "text-red-400"}`}>
          {formatTime(clipDuration)} clip {!isValid && "(5-60s required)"}
        </span>
        <span>{formatTime(endTime)}</span>
      </div>

      {/* Caption input */}
      <Input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Add a clip title..."
        className="bg-background border-white/10 text-white placeholder:text-muted-foreground text-sm mb-3 focus-visible:ring-primary/50"
        maxLength={100}
      />

      {/* Create button */}
      <Button
        onClick={handleCreate}
        disabled={creating || !isValid}
        className="w-full bg-primary text-foreground font-bold hover:brightness-110 border-0 disabled:opacity-50"
      >
        {creating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Clip...</>
        ) : (
          <><Scissors className="w-4 h-4 mr-2" /> Create Clip</>
        )}
      </Button>
    </motion.div>
  );
}
