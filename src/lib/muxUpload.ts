import { supabase } from "@/integrations/supabase/client";
import { createUpload } from "@mux/upchunk";

interface UploadOptions {
  userId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
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
}): Promise<UploadResult> {
  const { data, error } = await supabase.functions.invoke("mux-create-upload", {
    body: {
      userId: opts.userId,
      title: opts.title,
      description: opts.description || "",
      isPublic: opts.isPublic,
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

  console.log("[MuxUpload] Starting upload flow", {
    fileSize: opts.file.size,
    fileType: opts.file.type,
    isFile: opts.file instanceof File,
    title: opts.title,
    userId: opts.userId,
  });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[MuxUpload] Retry ${attempt}/${maxRetries} after ${2000 * attempt}ms delay...`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        opts.onProgress?.(0);
      }

      // Get a fresh upload URL each attempt (previous may have expired)
      console.log(`[MuxUpload] Attempt ${attempt + 1}: Requesting upload URL from edge function...`);
      const { uploadId, uploadUrl } = await createMuxUpload({
        userId: opts.userId,
        title: opts.title,
        description: opts.description,
        isPublic: opts.isPublic,
      });
      console.log(`[MuxUpload] Got upload URL`, { uploadId, uploadUrlPrefix: uploadUrl.substring(0, 80) });

      // Use UpChunk for chunked, resumable upload
      await new Promise<void>((resolve, reject) => {
        // UpChunk expects a File; wrap Blob if needed
        const file =
          opts.file instanceof File
            ? opts.file
            : new File([opts.file], "recording.webm", { type: opts.file.type || "video/webm" });

        console.log(`[MuxUpload] Creating UpChunk upload`, {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          chunkSize: opts.chunkSize ?? 5120,
        });

        const upload = createUpload({
          endpoint: uploadUrl,
          file,
          chunkSize: opts.chunkSize ?? 5120, // 5 MB chunks (in KB)
          maxFileSize: undefined as any, // no limit
        });

        upload.on("progress", (detail: { detail: number }) => {
          const pct = Math.round(detail.detail);
          if (pct % 10 === 0 || pct === 100) {
            console.log(`[MuxUpload] Progress: ${pct}%`);
          }
          opts.onProgress?.(pct);
        });

        upload.on("success", () => {
          console.log(`[MuxUpload] UpChunk upload SUCCESS for uploadId=${uploadId}`);
          resolve();
        });

        upload.on("error", (err: { detail: { message: string } }) => {
          console.error(`[MuxUpload] UpChunk upload ERROR`, err.detail);
          reject(new Error(err.detail?.message || "Chunked upload failed"));
        });

        upload.on("attempt", (detail: any) => {
          console.log(`[MuxUpload] UpChunk chunk attempt`, detail?.detail);
        });

        upload.on("attemptFailure", (detail: any) => {
          console.warn(`[MuxUpload] UpChunk chunk attempt FAILED`, detail?.detail);
        });

        upload.on("chunkSuccess", (detail: any) => {
          console.log(`[MuxUpload] Chunk uploaded successfully`, detail?.detail);
        });

        upload.on("offline", () => {
          console.warn(`[MuxUpload] Browser went OFFLINE during upload`);
        });

        upload.on("online", () => {
          console.log(`[MuxUpload] Browser back ONLINE, resuming upload`);
        });
      });

      console.log(`[MuxUpload] Upload complete! uploadId=${uploadId}`);
      return uploadId;
    } catch (err: any) {
      lastError = err;
      console.warn(`[MuxUpload] Attempt ${attempt + 1} failed: ${err.message}`, err);
    }
  }

  console.error(`[MuxUpload] All ${maxRetries + 1} attempts failed. Last error: ${lastError?.message}`);
  throw new Error(
    `Upload failed after ${maxRetries + 1} attempts: ${lastError?.message}`
  );
}
