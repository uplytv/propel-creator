import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

import { takeCapturedMedia, type CapturedMedia } from "@/lib/capturedMediaStore";
import { useAuth } from "@/context/AuthContext";
import { uploadVideoBlob } from "@/lib/cameraUpload";

/**
 * Editor for SHORT mode. Locks is_short = true, manually_overridden = true,
 * short_classification_reason = 'manual_short' on the resulting video row
 * (handled server-side by the upload pipeline once metadata is finalized).
 */
export default function ShortEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mediaRef = useRef<CapturedMedia | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    mediaRef.current = takeCapturedMedia();
    if (!mediaRef.current || mediaRef.current.kind !== "video") {
      toast.error("No video found");
      navigate("/camera?mode=SHORT", { replace: true });
      return;
    }
    if (mediaRef.current.caption) setCaption(mediaRef.current.caption);
    return () => {
      if (mediaRef.current?.previewUrl) {
        try {
          URL.revokeObjectURL(mediaRef.current.previewUrl);
        } catch {
          /* noop */
        }
      }
    };
  }, [navigate]);

  const onPublish = async () => {
    const media = mediaRef.current;
    if (!media || !user) return;
    if ((media.durationSeconds || 0) > 60.5) {
      toast.error("Shorts must be 60s or less");
      return;
    }
    setIsPublishing(true);
    try {
      // Suffix title so mux-webhook auto-flags + classifies as a SHORT.
      // (See mux-webhook for the title-based recording branch.)
      const finalTitle = (title.trim() || "Untitled Short") + " (Short)";
      await uploadVideoBlob({
        userId: user.id,
        title: finalTitle,
        description: caption.trim(),
        blob: media.blob,
        onProgress: setProgress,
      });
      toast.success("Short uploaded — processing now");
      navigate("/content-library", { replace: true });
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : "Try again" });
    } finally {
      setIsPublishing(false);
    }
  };

  const previewUrl = mediaRef.current?.previewUrl;
  const dur = mediaRef.current?.durationSeconds || 0;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0A0A0A", color: "#fff" }}>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="text-white/80">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold tracking-wide">📱 NEW SHORT</h1>
        <button
          onClick={onPublish}
          disabled={isPublishing}
          className="rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50"
          style={{ background: "#3D7CFF", color: "#0A0A0A" }}
        >
          {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ background: "rgba(61, 124, 255,0.12)", color: "#3D7CFF", border: "1px solid #3D7CFF" }}>
          LOCKED · SHORT (9:16, ≤60s)
        </div>
        {previewUrl && (
          <div className="mb-4 overflow-hidden rounded-2xl bg-black">
            <video src={previewUrl} controls playsInline className="aspect-[9/16] w-full object-cover" />
          </div>
        )}
        <p className="mb-3 text-xs text-white/50">Duration: {dur.toFixed(1)}s</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none"
        />
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption…"
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none"
        />
        {isPublishing && (
          <div className="mt-4">
            <Progress value={progress} />
            <p className="mt-1 text-xs text-white/60">Uploading… {Math.round(progress)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
