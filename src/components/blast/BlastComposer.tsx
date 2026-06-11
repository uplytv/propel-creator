import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Video, Loader2, Clock, Megaphone, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow, addDays, format } from "date-fns";
import * as UpChunk from "@mux/upchunk";

interface BlastComposerProps {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  spaceId: string;
  lastBlastSentAt: string | null;
}

export default function BlastComposer({ open, onClose, creatorId, spaceId, lastBlastSentAt }: BlastComposerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [muxAssetId, setMuxAssetId] = useState<string | null>(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Check eligibility
  const isLocked = (() => {
    if (!lastBlastSentAt) return false;
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(lastBlastSentAt).getTime() < threeDaysMs;
  })();

  const nextAvailable = lastBlastSentAt ? addDays(new Date(lastBlastSentAt), 3) : null;

  // Countdown timer
  useEffect(() => {
    if (!isLocked || !nextAvailable) return;
    const update = () => {
      const diff = nextAvailable.getTime() - Date.now();
      if (diff <= 0) { setCountdown(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setCountdown(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [isLocked, nextAvailable]);

  // Fetch member count
  useEffect(() => {
    if (!open) return;
    (async () => {
      // Try with email_opt_in filter first
      const { count: filteredCount, error } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .eq("email_opt_in", true);

      if (error?.message?.includes("email_opt_in") || error?.code === "42703") {
        // Column doesn't exist — fall back to total member count
        const { count: totalCount } = await supabase
          .from("community_members")
          .select("*", { count: "exact", head: true })
          .eq("creator_id", creatorId);
        setMemberCount(totalCount || 0);
      } else {
        setMemberCount(filteredCount || 0);
      }
    })();
  }, [open, creatorId]);

  const resetForm = () => {
    setSubject("");
    setMessage("");
    setMediaType(null);
    setMediaUrl(null);
    setMuxAssetId(null);
    setMuxPlaybackId(null);
    setUploading(false);
    setVideoProcessing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, GIF, or WebP image");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("blast-media").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("blast-media").getPublicUrl(path);
      setMediaType("image");
      setMediaUrl(publicUrl);
      setMuxAssetId(null);
      setMuxPlaybackId(null);
    } catch (err: any) {
      toast.error("Failed to upload image: " + err.message);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ["video/mp4", "video/quicktime", "video/webm"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload an MP4, MOV, or WebM video");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Video must be under 500MB");
      return;
    }

    setUploading(true);
    setVideoProcessing(true);
    try {
      // Get Mux upload URL
      const { data: uploadData, error: uploadErr } = await supabase.functions.invoke("mux-create-upload", {
        body: { userId: user.id, title: subject || "Blast Video" },
      });
      if (uploadErr) throw uploadErr;
      if (!uploadData?.uploadUrl) throw new Error("No upload URL returned");

      // Upload via UpChunk
      const upload = UpChunk.createUpload({
        endpoint: uploadData.uploadUrl,
        file,
        chunkSize: 5120,
      });

      await new Promise<void>((resolve, reject) => {
        upload.on("error", (err: any) => reject(err.detail));
        upload.on("success", () => resolve());
      });

      // Poll for readiness
      let ready = false;
      let attempts = 0;
      while (!ready && attempts < 60) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data: checkData } = await supabase.functions.invoke("mux-check-upload", {
          body: { uploadId: uploadData.uploadId },
        });
        if (checkData?.fixed && checkData.asset) {
          setMuxAssetId(checkData.asset.mux_asset_id);
          setMuxPlaybackId(checkData.asset.mux_playback_id);
          setMediaType("video");
          setMediaUrl(null);
          ready = true;
        }
        attempts++;
      }
      if (!ready) throw new Error("Video processing timed out");
    } catch (err: any) {
      toast.error("Failed to upload video: " + err.message);
      setMediaType(null);
    } finally {
      setUploading(false);
      setVideoProcessing(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const removeMedia = () => {
    setMediaType(null);
    setMediaUrl(null);
    setMuxAssetId(null);
    setMuxPlaybackId(null);
  };

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    try {
      // Create blast record
      const { data: blast, error: blastErr } = await supabase
        .from("community_blasts")
        .insert({
          creator_id: creatorId,
          space_id: spaceId,
          subject,
          message,
          media_type: mediaType,
          media_url: mediaUrl,
          mux_asset_id: muxAssetId,
          mux_playback_id: muxPlaybackId,
        })
        .select()
        .single();

      if (blastErr) throw blastErr;

      // Call edge function
      const { data: result, error: fnErr } = await supabase.functions.invoke("send-community-blast", {
        body: {
          blast_id: (blast as any).id,
          creator_id: creatorId,
          space_id: spaceId,
          subject,
          message,
          media_type: mediaType,
          media_url: mediaUrl,
          mux_playback_id: muxPlaybackId,
          mux_asset_id: muxAssetId,
        },
      });

      if (fnErr) throw fnErr;

      toast.success(`Blast sent to ${result?.recipient_count || 0} members!`);
      resetForm();
      onClose();
      queryClient.invalidateQueries({ queryKey: ["creator-space"] });
      queryClient.invalidateQueries({ queryKey: ["blast-history"] });
    } catch (err: any) {
      toast.error("Failed to send blast: " + err.message);
    } finally {
      setSending(false);
      setShowConfirm(false);
    }
  };

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && !uploading && !videoProcessing && !sending;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto border-border bg-card text-foreground p-0">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Community Blast
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Send a message to your entire community
            </DialogDescription>
          </DialogHeader>

          {isLocked ? (
            /* Locked State */
            <div className="p-5">
              <div className="rounded-xl p-6 text-center bg-card border border-border">
                <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  You sent a blast {lastBlastSentAt && formatDistanceToNow(new Date(lastBlastSentAt), { addSuffix: true })}.
                </p>
                <p className="text-sm text-muted-foreground mb-1">
                  Next blast available on{" "}
                  <span className="text-foreground font-semibold">
                    {nextAvailable && format(nextAvailable, "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </p>
                {countdown && (
                  <p className="text-xs text-primary font-mono mt-2">{countdown} remaining</p>
                )}
                <Button disabled className="mt-4 w-full opacity-50">
                  Send Blast
                </Button>
              </div>
            </div>
          ) : (
            /* Composer */
            <div className="p-5 space-y-4">
              {/* Subject */}
              <div>
                <Input
                  placeholder="What's this about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, 100))}
                  maxLength={100}
                  className="bg-muted border-0 font-semibold"
                />
                <p className="text-[10px] text-muted-foreground text-right mt-1">{subject.length}/100</p>
              </div>

              {/* Message */}
              <div>
                <Textarea
                  placeholder="Write your message to your community…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                  maxLength={2000}
                  rows={6}
                  className="bg-muted border-0 text-sm"
                />
                <p className="text-[10px] text-muted-foreground text-right mt-1">{message.length}/2000</p>
              </div>

              {/* Media Upload Zone */}
              {!mediaType && !uploading && (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <p className="text-xs text-muted-foreground mb-3">Attach a photo or video (optional)</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      <ImageIcon className="w-4 h-4" /> Upload Image
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => videoInputRef.current?.click()}
                      className="gap-1.5"
                    >
                      <Video className="w-4 h-4" /> Upload Video
                    </Button>
                  </div>
                  <input ref={imageInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleImageUpload} />
                  <input ref={videoInputRef} type="file" accept=".mp4,.mov,.webm" className="hidden" onChange={handleVideoUpload} />
                </div>
              )}

              {/* Upload progress */}
              {(uploading || videoProcessing) && (
                <div className="rounded-xl p-6 text-center bg-muted">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {videoProcessing ? "Processing video…" : "Uploading…"}
                  </p>
                </div>
              )}

              {/* Image Preview */}
              {mediaType === "image" && mediaUrl && (
                <div className="relative rounded-lg overflow-hidden">
                  <img src={mediaUrl} alt="" loading="lazy" className="w-full max-h-[300px] object-cover rounded-lg" />
                  <button
                    onClick={removeMedia}
                    aria-label="Remove media"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              )}

              {/* Video Preview */}
              {mediaType === "video" && muxPlaybackId && (
                <div className="relative rounded-lg overflow-hidden">
                  <div className="relative">
                    <img
                      src={`https://image.mux.com/${muxPlaybackId}/thumbnail.jpg`}
                      alt=""
                      loading="lazy"
                      className="w-full rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-primary-foreground ml-1" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={removeMedia}
                    aria-label="Remove media"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              )}

              {/* Recipient preview */}
              <p className="text-xs text-muted-foreground">
                This blast will reach <span className="text-foreground font-semibold">{memberCount}</span> members
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={!canSend}
                  className="flex-1 bg-primary text-primary-foreground font-semibold"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Blast"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Send this blast?</AlertDialogTitle>
            <AlertDialogDescription>
              Send this blast to {memberCount} members? You won't be able to send another for 3 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending} className="bg-primary text-primary-foreground">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
