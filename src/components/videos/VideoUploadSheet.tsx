import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2, Film, Check, CloudUpload, Image, Tag, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCreateVideo } from "@/hooks/useVideos";
import { uploadToMuxWithRetry } from "@/lib/muxUpload";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const CATEGORIES = ["Fitness", "Finance", "Gaming", "Lifestyle", "Business", "Education", "Music", "IRL", "Other"];

type Visibility = "public" | "members" | "unlisted" | "private";

interface VideoUploadSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function VideoUploadSheet({ open, onClose }: VideoUploadSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createVideo = useCreateVideo();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "processing" | "ready" | "error">("idle");
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [muxAssetId, setMuxAssetId] = useState<string | null>(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const [muxDuration, setMuxDuration] = useState(0);
  const uploadStartRef = useRef(0);
  const lastBytesRef = useRef(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [customThumb, setCustomThumb] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Creator profile for navigation after publish
  const { data: creatorProfile } = useQuery({
    queryKey: ["my-profile-upload", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles_public")
        .select("username, display_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const reset = () => {
    setFile(null);
    setUploadId(null);
    setUploadProgress(0);
    setUploadPhase("idle");
    setUploadSpeed("");
    setMuxAssetId(null);
    setMuxPlaybackId(null);
    setMuxDuration(0);
    setTitle("");
    setDescription("");
    setCategory("Other");
    setTags([]);
    setTagInput("");
    setVisibility("public");
    setCustomThumb(null);
    setScheduledDate("");
    setScheduledTime("");
    setUploading(false);
    setPublishing(false);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const handleClose = () => {
    if (uploading && uploadPhase === "uploading") {
      if (!confirm("Upload in progress. Close anyway?")) return;
    }
    reset();
    onClose();
  };

  // Start upload immediately on file selection
  const startUpload = useCallback(async (selectedFile: File) => {
    if (!user) return;
    setFile(selectedFile);
    if (!title) setTitle(selectedFile.name.replace(/\.[^.]+$/, ""));
    setTimeout(() => titleRef.current?.focus(), 100);

    setUploading(true);
    setUploadPhase("uploading");
    uploadStartRef.current = Date.now();
    lastBytesRef.current = 0;

    try {
      const id = await uploadToMuxWithRetry({
        userId: user.id,
        title: selectedFile.name.replace(/\.[^.]+$/, ""),
        description: "",
        file: selectedFile,
        onProgress: (pct) => {
          setUploadProgress(pct);
          // Calculate speed
          const elapsed = (Date.now() - uploadStartRef.current) / 1000;
          if (elapsed > 1) {
            const bytesUploaded = (pct / 100) * selectedFile.size;
            const speedMBps = (bytesUploaded / elapsed) / (1024 * 1024);
            const remaining = ((selectedFile.size - bytesUploaded) / (bytesUploaded / elapsed));
            const mins = Math.floor(remaining / 60);
            const secs = Math.floor(remaining % 60);
            const timeStr = mins > 0 ? `about ${mins}m ${secs}s remaining` : `about ${secs}s remaining`;
            setUploadSpeed(`Uploading at ${speedMBps.toFixed(1)} MB/s — ${timeStr}`);
          }
        },
      });

      setUploadId(id);
      setUploadPhase("processing");
      setUploadSpeed("");

      // Poll for ready
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await supabase.functions.invoke("mux-check-upload", {
            body: { uploadId: id },
          });
          if (data?.status === "ready" && data?.assetId) {
            setMuxAssetId(data.assetId);
            setMuxPlaybackId(data.playbackId || "");
            setMuxDuration(data.duration || 0);
            setUploadPhase("ready");
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {}
      }, 3000);
    } catch (err: any) {
      setUploadPhase("error");
      setUploadSpeed("");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  }, [user, title, toast]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith("video/") || f.name.match(/\.(mp4|mov|webm)$/i))) {
      startUpload(f);
    }
  }, [startUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) startUpload(f);
  };

  const handleRetry = () => {
    if (file) {
      setUploadPhase("idle");
      setUploadProgress(0);
      startUpload(file);
    }
  };

  const handleTagAdd = (e: React.KeyboardEvent) => {
    if ((e.key === "," || e.key === "Enter") && tagInput.trim() && tags.length < 5) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, "");
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !user) return;
    if (f.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Thumbnail must be under 2MB", variant: "destructive" });
      return;
    }
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("covers").upload(path, f);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("covers").getPublicUrl(path);
    setCustomThumb(publicUrl);
  };

  const handlePublish = async (draft = false) => {
    if (!user || !title.trim()) return;
    if (!draft && uploadPhase !== "ready") return;

    setPublishing(true);
    try {
      const thumbnailUrl = customThumb || (muxPlaybackId ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg` : null);
      const scheduledPublishAt = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : undefined;
      const effectiveVisibility = scheduledPublishAt ? "private" : (draft ? "private" : visibility);

      const result = await createVideo.mutateAsync({
        title: title.trim(),
        description,
        category,
        tags,
        visibility: effectiveVisibility,
        scheduled_publish_at: scheduledPublishAt,
        is_public: effectiveVisibility === "public",
        mux_asset_id: muxAssetId || undefined,
        playback_id: muxPlaybackId || undefined,
        thumbnail_url: thumbnailUrl || undefined,
        duration_seconds: Math.round(muxDuration),
      });

      reset();
      onClose();

      if (scheduledPublishAt) {
        toast({ title: "Video scheduled ✓", description: `Will publish on ${new Date(scheduledPublishAt).toLocaleString()}` });
      } else if (!draft && result?.slug) {
        const username = creatorProfile?.username || creatorProfile?.display_name || user.id;
        navigate(`/${encodeURIComponent(username)}/videos/${result.slug}`);
        toast({ title: "Video published ✓", description: "Your video is live!" });
      } else {
        toast({ title: draft ? "Draft saved" : "Video published ✓" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const autoThumb = muxPlaybackId ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?width=320&height=180&time=2` : null;
  const displayThumb = customThumb || autoThumb;

  const visibilityOptions: { key: Visibility; icon: string; label: string; desc: string }[] = [
    { key: "public", icon: "🌍", label: "Public", desc: "Anyone can watch" },
    { key: "members", icon: "🔒", label: "Members Only", desc: "Paid subscribers only" },
    { key: "unlisted", icon: "📝", label: "Unlisted", desc: "Only people with the link" },
  ];

  const publishDisabled = !title.trim() || publishing || (uploadPhase !== "ready" && uploadPhase !== "idle");
  const publishLabel = publishing
    ? "Publishing…"
    : uploadPhase === "uploading"
    ? `Uploading ${uploadProgress}%…`
    : uploadPhase === "processing"
    ? "Processing…"
    : "Publish Video →";

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`fixed z-[71] bg-background overflow-y-auto ${
              isMobile
                ? "inset-0"
                : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[640px] max-h-[90vh] rounded-2xl border border-border"
            }`}
            style={isMobile ? { height: "100dvh", paddingBottom: "env(safe-area-inset-bottom)" } : {}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top progress bar */}
            {(uploadPhase === "uploading" || uploadPhase === "processing") && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-secondary z-10">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: uploadPhase === "processing" ? "100%" : `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground font-display">Upload Video</h2>
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Upload zone — only show if no file selected */}
              {!file ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`rounded-lg p-8 text-center cursor-pointer transition-all border-2 border-dashed ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <CloudUpload className="w-10 h-10 mx-auto text-primary mb-3" />
                  <p className="text-base font-semibold text-foreground mb-1">Drag and drop your video</p>
                  <p className="text-sm text-muted-foreground mb-3">or</p>
                  <Button variant="outline" size="sm" className="border-primary text-primary">
                    Choose File
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">MP4, MOV, or WebM · Up to 4GB</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                    capture={undefined}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              ) : (
                <>
                  {/* Progress section */}
                  <div className="rounded-lg p-3 bg-card border border-border space-y-2">
                    <div className="flex items-center gap-3">
                      <Film className="w-6 h-6 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                      {uploadPhase === "ready" && <Check className="w-5 h-5 text-primary shrink-0" />}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${uploadPhase === "error" ? "bg-destructive" : "bg-primary"}`}
                        animate={{ width: uploadPhase === "processing" || uploadPhase === "ready" ? "100%" : `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {uploadPhase === "uploading" && `Uploading… ${uploadProgress}%`}
                        {uploadPhase === "processing" && (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Processing video…
                          </span>
                        )}
                        {uploadPhase === "ready" && <span className="text-primary font-medium">✓ Ready to publish</span>}
                        {uploadPhase === "error" && (
                          <span className="text-destructive">Upload failed.{" "}
                            <button onClick={handleRetry} className="underline font-medium">Tap to retry</button>
                          </span>
                        )}
                      </p>
                    </div>
                    {uploadSpeed && uploadPhase === "uploading" && (
                      <p className="text-[11px] text-muted-foreground">{uploadSpeed}</p>
                    )}
                  </div>

                  {/* Details form */}
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title *</label>
                      <div className="relative">
                        <Input
                          ref={titleRef}
                          value={title}
                          onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                          placeholder="Add a title that describes your video"
                          className="bg-card border-border pr-12"
                          maxLength={100}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                          {title.length}/100
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                      <div className="relative">
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                          placeholder="Tell viewers about your video"
                          rows={4}
                          className="bg-card border-border resize-none pr-16"
                          maxLength={2000}
                        />
                        <span className="absolute right-3 bottom-2 text-[10px] text-muted-foreground">
                          {description.length}/2000
                        </span>
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Thumbnail</label>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-[72px] rounded-lg overflow-hidden bg-card border border-border flex items-center justify-center shrink-0">
                          {displayThumb ? (
                            <img src={displayThumb} alt="Thumbnail" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Image className="w-5 h-5 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground">Auto-generated</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => thumbRef.current?.click()}
                          className="text-xs"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Upload Custom
                        </Button>
                        <input
                          ref={thumbRef}
                          type="file"
                          accept="image/jpeg,image/png,.jpg,.png"
                          className="hidden"
                          onChange={handleThumbUpload}
                        />
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="bg-card border-border focus:ring-primary">
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
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            {tag}
                            <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-foreground">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      {tags.length < 5 && (
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagAdd}
                          placeholder="Add tags (press comma to add)"
                          className="bg-card border-border"
                        />
                      )}
                    </div>

                    {/* Visibility */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visibility</label>
                      <div className="grid grid-cols-3 gap-2">
                        {visibilityOptions.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => setVisibility(opt.key)}
                            className={`p-3 rounded-lg border text-center transition-all ${
                              visibility === opt.key
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-primary/30"
                            }`}
                          >
                            <span className="text-lg block mb-1">{opt.icon}</span>
                            <span className={`text-xs font-semibold block ${visibility === opt.key ? "text-primary" : "text-foreground"}`}>
                              {opt.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom action bar */}
            {file && (
              <div
                className="sticky bottom-0 bg-background border-t border-border px-4 py-3 flex gap-3"
                style={{ paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom) + 12px)" : undefined }}
              >
                <Button
                  variant="ghost"
                  onClick={() => handlePublish(true)}
                  disabled={!title.trim() || publishing || !muxAssetId}
                  className="text-sm"
                >
                  Save Draft
                </Button>
                <Button
                  onClick={() => handlePublish(false)}
                  disabled={publishDisabled && uploadPhase !== "ready"}
                  className="flex-1 gap-2"
                >
                  {uploadPhase === "uploading" && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploadPhase === "processing" && <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />}
                  {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {publishLabel}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
