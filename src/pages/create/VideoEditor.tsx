import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

import { takeCapturedMedia, type CapturedMedia } from "@/lib/capturedMediaStore";
import { useAuth } from "@/context/AuthContext";
import { uploadVideoBlob } from "@/lib/cameraUpload";

const CATEGORIES = [
  "Music", "Finance", "Fitness", "Gaming", "Education", "Entertainment",
  "Comedy", "News", "Sports", "Persian/Cultural", "Business", "Lifestyle",
  "Tech", "Food", "Travel",
];

/**
 * Editor for VIDEO mode. Auto-classification (vertical ≤ 60s → Short) runs
 * server-side; the toggle here lets the creator override Auto/Short/Long.
 */
export default function VideoEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mediaRef = useRef<CapturedMedia | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Entertainment");
  const [classification, setClassification] = useState<"auto" | "short" | "long">("auto");
  const [progress, setProgress] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    mediaRef.current = takeCapturedMedia();
    if (!mediaRef.current || mediaRef.current.kind !== "video") {
      toast.error("No video found");
      navigate("/camera?mode=VIDEO", { replace: true });
      return;
    }
    if (mediaRef.current.caption) setDescription(mediaRef.current.caption);
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
    setIsPublishing(true);
    try {
      let suffix = "";
      if (classification === "short") suffix = " (Short)";
      else if (classification === "long") suffix = " (Long)";
      const finalTitle = (title.trim() || "Untitled Video") + suffix;
      await uploadVideoBlob({
        userId: user.id,
        title: finalTitle,
        description: `[${category}] ${description.trim()}`.trim(),
        blob: media.blob,
        onProgress: setProgress,
      });
      toast.success("Video uploaded — processing");
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
        <h1 className="text-sm font-semibold tracking-wide">🎬 NEW VIDEO</h1>
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
        {previewUrl && (
          <div className="mb-4 overflow-hidden rounded-2xl bg-black">
            <video src={previewUrl} controls playsInline className="aspect-video w-full" />
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className="mb-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none"
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-black text-white">{c}</option>
          ))}
        </select>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">Classification</label>
        <div className="grid grid-cols-3 gap-2">
          {(["auto", "short", "long"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setClassification(opt)}
              className="rounded-xl py-2 text-xs font-bold uppercase transition-colors"
              style={{
                background: classification === opt ? "#3D7CFF" : "rgba(255,255,255,0.06)",
                color: classification === opt ? "#0A0A0A" : "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {opt === "auto" ? "Auto" : opt === "short" ? "Short" : "Long-form"}
            </button>
          ))}
        </div>

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
