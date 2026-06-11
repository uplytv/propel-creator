import { useState, useRef } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface StoryCreatorProps {
  onClose: () => void;
}

export default function StoryCreator({ onClose }: StoryCreatorProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const postStory = async () => {
    if (!selectedFile || !user) return;
    setIsPosting(true);
    setError(null);
    try {
      const fileExt = selectedFile.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, selectedFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: selectedFile.type,
        });
      if (uploadError) throw new Error("Upload failed: " + uploadError.message);

      const { data: urlData } = supabase.storage
        .from("stories")
        .getPublicUrl(uploadData.path);
      if (!urlData.publicUrl) throw new Error("Could not get public URL");

      const { error: insertError } = await (supabase as any).from("stories").insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: selectedFile.type.startsWith("video") ? "video" : "image",
        caption: caption.trim() || null,
        location_label: locationLabel.trim() || null,
        event_id: null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (insertError) throw new Error("Save failed: " + insertError.message);

      toast.success("Story posted! ✓");
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["my-story"] });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[99]"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] max-h-[90vh] overflow-y-auto"
        style={{
          background: "#141414",
          borderRadius: "20px 20px 0 0",
          padding: "16px 20px 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }} />

        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>Share Your Plan</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        {/* Media preview or upload area */}
        {preview ? (
          <div
            className="relative w-full overflow-hidden mb-4"
            style={{ borderRadius: 16, aspectRatio: "9/16", maxHeight: 340 }}
          >
            {selectedFile?.type.startsWith("video") ? (
              <video src={preview} className="w-full h-full object-cover" autoPlay muted playsInline />
            ) : (
              <img src={preview} className="w-full h-full object-cover" alt="" loading="lazy" />
            )}
            <button
              onClick={() => { setSelectedFile(null); setPreview(null); }}
              aria-label="Remove media"
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center w-full mb-4 cursor-pointer"
            style={{
              height: 180,
              borderRadius: 16,
              border: "2px dashed rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <Upload className="w-8 h-8 mb-2" style={{ color: "rgba(255,255,255,0.25)" }} />
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Tap to upload photo or video</span>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          </label>
        )}

        {/* Caption */}
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Where are you going?"
          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 mb-3"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        />

        {/* Location */}
        <input
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
          placeholder="📍 Location (optional)"
          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 mb-4"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        />

        {/* Error message */}
        {error && (
          <p className="text-sm mb-3 px-1" style={{ color: "#FF3B30" }}>
            {error}
          </p>
        )}

        {/* Post button — always visible */}
        <button
          onClick={postStory}
          disabled={!selectedFile || isPosting}
          className="w-full flex items-center justify-center gap-2 transition-transform active:scale-[0.97]"
          style={{
            height: 48,
            borderRadius: 12,
            background: !selectedFile ? "rgba(61, 124, 255,0.3)" : "#3D7CFF",
            color: "#0A0A0A",
            fontSize: 15,
            fontWeight: 800,
            opacity: isPosting ? 0.7 : 1,
          }}
        >
          {isPosting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Posting…
            </>
          ) : (
            "Post Story"
          )}
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
