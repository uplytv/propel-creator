import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getAllChunks, clearChunks } from "@/lib/recordingStore";
import { toast } from "sonner";

/**
 * On mount, checks for:
 * 1. Orphaned IndexedDB recording chunks → auto-uploads them
 * 2. Stuck "preparing" mux_assets → polls mux-check-upload to sync status
 */
export function useAutoRecoverUploads() {
  const { user } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user || hasRun.current) return;
    hasRun.current = true;

    // 1. Recover orphaned IndexedDB chunks
    (async () => {
      try {
        const chunks = await getAllChunks();
        if (chunks.length === 0) return;

        toast.info("Recovering unsaved recording...", { duration: 5000 });
        const blob = new Blob(chunks, { type: "video/webm" });
        const { uploadToMuxWithRetry } = await import("@/lib/muxUpload");
        await uploadToMuxWithRetry({
          userId: user.id,
          title: `Recovered Recording`,
          description: "Auto-recovered from interrupted session",
          isPublic: false,
          file: blob,
        });
        await clearChunks();
        toast.success("Recording recovered & uploaded! 🎬");
      } catch (err) {
        console.warn("[AutoRecover] Failed to recover chunks:", err);
      }
    })();

    // 2. Fix stuck "preparing" assets by calling mux-check-upload
    (async () => {
      try {
        const { data: stuckAssets } = await supabase
          .from("mux_assets")
          .select("id, upload_id, status, created_at")
          .eq("user_id", user.id)
          .in("status", ["preparing", "waiting"])
          .not("upload_id", "is", null);

        if (!stuckAssets || stuckAssets.length === 0) return;

        // Only check assets older than 2 minutes (give webhook time)
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const toCheck = stuckAssets.filter((a) => a.created_at && a.created_at < twoMinAgo);

        for (const asset of toCheck) {
          try {
            const { data } = await supabase.functions.invoke("mux-check-upload", {
              body: { uploadId: asset.upload_id },
            });
            if (data?.status === "ready") {
              console.log(`[AutoRecover] Asset ${asset.id} is now ready`);
            } else if (data?.status === "errored") {
              await supabase
                .from("mux_assets")
                .update({ status: "errored" })
                .eq("id", asset.id);
            }
          } catch {
            // Silently continue
          }
        }
      } catch (err) {
        console.warn("[AutoRecover] Failed to check stuck assets:", err);
      }
    })();
  }, [user]);
}
