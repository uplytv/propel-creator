import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { takeCapturedMedia, type CapturedMedia } from "@/lib/capturedMediaStore";
import { useAuth } from "@/context/AuthContext";
import { uploadImageBlob } from "@/lib/cameraUpload";

/** Editor for STORY mode — caption + 24h ephemeral publish. */
export default function StoryEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mediaRef = useRef<CapturedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    mediaRef.current = takeCapturedMedia();
    if (!mediaRef.current) {
      toast.error("No media found");
      navigate("/camera?mode=STORY", { replace: true });
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
    setIsPublishing(true);
    try {
      const url = await uploadImageBlob({
        userId: user.id,
        blob: media.blob,
        bucket: "stories",
        ext: media.kind === "video" ? "webm" : "jpg",
      });
      const { error } = await (supabase as any).from("stories").insert({
        user_id: user.id,
        media_url: url,
        media_type: media.kind === "video" ? "video" : "image",
        caption: caption.trim() || null,
        location_label: locationLabel.trim() || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      toast.success("Story posted");
      navigate("/social", { replace: true });
    } catch (e) {
      toast.error("Failed to post story", { description: e instanceof Error ? e.message : "Try again" });
    } finally {
      setIsPublishing(false);
    }
  };

  const previewUrl = mediaRef.current?.previewUrl;
  const isVideo = mediaRef.current?.kind === "video";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0A0A0A", color: "#fff" }}>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="text-white/80">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold tracking-wide">NEW STORY · 24H</h1>
        <button
          onClick={onPublish}
          disabled={isPublishing}
          className="rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50"
          style={{ background: "#3D7CFF", color: "#0A0A0A" }}
        >
          {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {previewUrl && (
          <div className="mb-4 overflow-hidden rounded-2xl bg-black">
            {isVideo ? (
              <video src={previewUrl} controls playsInline className="aspect-[9/16] w-full object-cover" />
            ) : (
              <img src={previewUrl} alt="Preview" className="aspect-[9/16] w-full object-cover" />
            )}
          </div>
        )}
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption (optional)"
          className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none"
        />
        <input
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
          placeholder="📍 Location (optional)"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none"
        />
      </div>
    </div>
  );
}
