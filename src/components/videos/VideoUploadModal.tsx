import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, X, Loader2, Film, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateVideo } from "@/hooks/useVideos";
import { uploadToMuxWithRetry } from "@/lib/muxUpload";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Fitness", "Finance", "Gaming", "Lifestyle", "Business", "Education", "Music", "IRL", "Other"];

interface VideoUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function VideoUploadModal({ open, onClose }: VideoUploadModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createVideo = useCreateVideo();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [tagsInput, setTagsInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [polling, setPolling] = useState(false);

  const reset = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setCategory("Other");
    setTagsInput("");
    setIsPublic(true);
    setUploading(false);
    setProgress(0);
    setPolling(false);
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|webm)$/i))) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  }, [title]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  };

  const pollForReady = async (uploadId: string): Promise<{ assetId: string; playbackId: string; duration: number }> => {
    setPolling(true);
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const { data } = await supabase.functions.invoke("mux-check-upload", {
          body: { uploadId },
        });
        if (data?.status === "ready" && data?.assetId) {
          return { assetId: data.assetId, playbackId: data.playbackId || "", duration: data.duration || 0 };
        }
      } catch {}
    }
    throw new Error("Video processing timed out");
  };

  const handlePublish = async () => {
    if (!user || !file || !title.trim()) return;
    setUploading(true);

    try {
      const uploadId = await uploadToMuxWithRetry({
        userId: user.id,
        title: title.trim(),
        description,
        file,
        onProgress: setProgress,
      });

      const { assetId, playbackId, duration } = await pollForReady(uploadId);

      const tags = tagsInput
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)
        .slice(0, 5);

      await createVideo.mutateAsync({
        title: title.trim(),
        description,
        category,
        tags,
        is_public: isPublic,
        mux_asset_id: assetId,
        playback_id: playbackId,
        thumbnail_url: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
        duration_seconds: Math.round(duration),
      });

      reset();
      onClose();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setPolling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg bg-card border-border" style={{ background: "hsl(var(--background))" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Upload className="w-5 h-5 text-primary" /> Upload Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Film className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">Drag & drop your video</p>
              <p className="text-xs text-muted-foreground">MP4, MOV, WebM • Up to 4GB</p>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "hsl(var(--background))", border: "1px solid #1E1E1E" }}>
              <Film className="w-8 h-8 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              {!uploading && (
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: polling ? "100%" : `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {polling ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processing video…
                  </span>
                ) : (
                  `Uploading… ${progress}%`
                )}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome video"
              className="bg-secondary/50"
              disabled={uploading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this video about?"
              rows={3}
              className="bg-secondary/50 resize-none"
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
            <Select value={category} onValueChange={setCategory} disabled={uploading}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma separated, max 5)</label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. fitness, workout, tips"
              className="bg-secondary/50"
              disabled={uploading}
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-foreground">Public</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={uploading} />
          </div>

          {/* Publish */}
          <Button
            onClick={handlePublish}
            disabled={!file || !title.trim() || uploading}
            className="w-full gap-2"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {polling ? "Processing…" : "Uploading…"}</>
            ) : (
              <><Check className="w-4 h-4" /> Publish Video</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
