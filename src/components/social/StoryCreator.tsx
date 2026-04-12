import { useState } from "react";
import { X, Upload } from "lucide-react";
import { useStories } from "@/hooks/useStories";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StoryCreatorProps {
  onClose: () => void;
}

export default function StoryCreator({ onClose }: StoryCreatorProps) {
  const { user } = useAuth();
  const { createStory } = useStories();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handlePost = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("stories").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(path);

      await createStory({
        mediaUrl: urlData.publicUrl,
        mediaType: file.type.startsWith("video") ? "video" : "image",
        caption: caption || undefined,
        locationLabel: locationLabel || undefined,
      });
      toast.success("Story posted!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to post story");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full max-w-lg rounded-t-2xl p-4 pb-8 space-y-4"
        style={{ backgroundColor: "rgba(10,10,10,0.98)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">New Story</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-white/50" /></button>
        </div>

        {preview ? (
          <div className="relative aspect-[9/16] max-h-[300px] w-full overflow-hidden rounded-xl">
            {file?.type.startsWith("video") ? (
              <video src={preview} className="w-full h-full object-cover" autoPlay muted playsInline />
            ) : (
              <img src={preview} className="w-full h-full object-cover" alt="" />
            )}
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 rounded-xl border border-dashed cursor-pointer" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
            <Upload className="w-8 h-8 text-white/30 mb-2" />
            <span className="text-sm text-white/40">Upload photo or video</span>
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          </label>
        )}

        <Input
          placeholder="Add a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
        <Input
          placeholder="📍 Location (optional)"
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />

        <Button
          onClick={handlePost}
          disabled={!file || uploading}
          className="w-full font-semibold"
          style={{ backgroundColor: "#00FF85", color: "#000" }}
        >
          {uploading ? "Posting..." : "Post Story"}
        </Button>
      </div>
    </div>
  );
}
