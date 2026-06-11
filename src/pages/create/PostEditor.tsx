import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { takeCapturedMedia, type CapturedMedia } from "@/lib/capturedMediaStore";
import { useAuth } from "@/context/AuthContext";
import { uploadImageBlob } from "@/lib/cameraUpload";
import { useSocialPosts } from "@/hooks/useSocialPosts";

/** Editor for POST mode — caption + publish as a feed post. */
export default function PostEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createPost } = useSocialPosts();

  const mediaRef = useRef<CapturedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Take media off the global stash exactly once
  useEffect(() => {
    mediaRef.current = takeCapturedMedia();
    if (!mediaRef.current) {
      toast.error("No photo found", { description: "Capture again from the camera." });
      navigate("/camera?mode=POST", { replace: true });
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

  const previewUrl = mediaRef.current?.previewUrl;

  const onPublish = async () => {
    const media = mediaRef.current;
    if (!media || !user) return;
    setIsPublishing(true);
    try {
      const url = await uploadImageBlob({ userId: user.id, blob: media.blob, bucket: "stories" });
      await createPost({ content: caption.trim(), mediaUrls: [url], postType: "general" });
      toast.success("Posted to your feed");
      navigate("/social", { replace: true });
    } catch (e) {
      toast.error("Failed to post", { description: e instanceof Error ? e.message : "Try again" });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: "#0A0A0A", color: "#fff" }}>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="text-white/80">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold tracking-wide">NEW POST</h1>
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
            <img src={previewUrl} alt="Preview" className="aspect-[4/5] w-full object-cover" />
          </div>
        )}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption…"
          rows={4}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/40 outline-none"
        />
      </div>
    </div>
  );
}
