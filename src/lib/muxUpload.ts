import { supabase } from "@/integrations/supabase/client";
import { createUpload } from "@mux/upchunk";
import { Sentry } from "@/lib/sentry";

interface UploadOptions {
  userId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  /** 'paid' = Mux signed playback (viewers need a token from sign-playback-token). */
  access?: "public" | "paid";
  file: Blob;
  onProgress?: (percent: number) => void;
  maxRetries?: number;
  chunkSize?: number;
}

interface UploadResult {
  uploadId: string;
  uploadUrl: string;
}

async function createMuxUpload(opts: {
  userId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  access?: "public" | "paid";
}): Promise<UploadResult> {
  const { data, error } = await supabase.functions.invoke("mux-create-upload", {
    body: {
      userId: opts.userId,
      title: opts.title,
      description: opts.description || "",
      isPublic: opts.isPublic,
      access: opts.access ?? "public",
    },
  });
  if (error || !data?.uploadUrl)
    throw new Error(error?.message || "Failed to create upload");
  return { uploadId: data.uploadId, uploadUrl: data.uploadUrl };
}

/**
 * Upload a video to Mux using UpChunk (chunked, resumable).
 * Automatically retries failed chunks and resumes interrupted uploads.
 */
export async function uploadToMuxWithRetry(opts: UploadOptions): Promise<string> {
  const maxRetries = opts.maxRetries ?? 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        opts.onProgress?.(0);
      }

      // Get a fresh upload URL each attempt (previous may have expired)
      const { uploadId, uploadUrl } = await createMuxUpload({
        userId: opts.userId,
        title: opts.title,
        description: opts.description,
        isPublic: opts.isPublic,
        access: opts.access,
      });

      // Use UpChunk for chunked, resumable upload
      await new Promise<void>((resolve, reject) => {
        // UpChunk expects a File; wrap Blob if needed
        const file =
          opts.file instanceof File
            ? opts.file
            : new File([opts.file], "recording.webm", { type: opts.file.type || "video/webm" });

        const upload = createUpload({
          endpoint: uploadUrl,
          file,
          chunkSize: opts.chunkSize ?? 10240, // 10 MB chunks (in KB) — faster on good connections
          maxFileSize: undefined as any, // no limit (matches YouTube)
          attempts: 5,            // retry each chunk up to 5 times
          delayBeforeAttempt: 3,  // wait 3 seconds between retries
        });

        upload.on("progress", (detail: { detail: number }) => {
          const pct = Math.round(detail.detail);
          opts.onProgress?.(pct);
        });

        upload.on("success", () => {
          resolve();
        });

        upload.on("error", (err: { detail: { message: string } }) => {
          Sentry.captureException(err.detail, { tags: { context: "mux_upload" } });
          reject(new Error(err.detail?.message || "Chunked upload failed"));
        });

        upload.on("attempt", () => {});

        upload.on("attemptFailure", (detail: any) => {
          console.warn(`[MuxUpload] UpChunk chunk attempt FAILED`, detail?.detail);
        });

        upload.on("chunkSuccess", () => {});

        upload.on("offline", () => {
          console.warn(`[MuxUpload] Browser went OFFLINE during upload`);
        });

        upload.on("online", () => {});
      });

      return uploadId;
    } catch (err: any) {
      lastError = err;
      console.warn(`[MuxUpload] Attempt ${attempt + 1} failed: ${err.message}`, err);
    }
  }

  Sentry.captureMessage(`[MuxUpload] All ${maxRetries + 1} attempts failed. Last error: ${lastError?.message}`, { tags: { context: "mux_upload" } });
  throw new Error(
    `Upload failed after ${maxRetries + 1} attempts: ${lastError?.message}`
  );
}
