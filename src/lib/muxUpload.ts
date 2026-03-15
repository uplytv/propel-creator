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

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Mux upload retry ${attempt}/${maxRetries}...`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        opts.onProgress?.(0);
      }

      // Get a fresh upload URL each attempt (previous may have expired)
      const { uploadId, uploadUrl } = await createMuxUpload({
        userId: opts.userId,
        title: opts.title,
        description: opts.description,
        isPublic: opts.isPublic,
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
          chunkSize: opts.chunkSize ?? 5120, // 5 MB chunks (in KB)
          maxFileSize: undefined as any, // no limit
        });

        upload.on("progress", (detail: { detail: number }) => {
          opts.onProgress?.(Math.round(detail.detail));
        });

        upload.on("success", () => {
          resolve();
        });

        upload.on("error", (err: { detail: { message: string } }) => {
          reject(new Error(err.detail?.message || "Chunked upload failed"));
        });
      });

      return uploadId;
    } catch (err: any) {
      lastError = err;
      console.warn(`Mux upload attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  throw new Error(
    `Upload failed after ${maxRetries + 1} attempts: ${lastError?.message}`
  );
}
