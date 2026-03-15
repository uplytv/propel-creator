import { supabase } from "@/integrations/supabase/client";

interface UploadOptions {
  userId: string;
  title: string;
  description?: string;
  isPublic?: boolean;
  file: Blob;
  onProgress?: (percent: number) => void;
  maxRetries?: number;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

interface UploadResult {
  uploadId: string;
  uploadUrl: string;
}

async function createMuxUpload(opts: { userId: string; title: string; description?: string; isPublic?: boolean }): Promise<UploadResult> {
  const { data, error } = await supabase.functions.invoke("mux-create-upload", {
    body: { userId: opts.userId, title: opts.title, description: opts.description || "", isPublic: opts.isPublic },
  });
  if (error || !data?.uploadUrl) throw new Error(error?.message || "Failed to create upload");
  return { uploadId: data.uploadId, uploadUrl: data.uploadUrl };
}

function uploadFile(url: string, file: Blob, onProgress?: (p: number) => void, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timed out"));

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "video/webm");
    xhr.send(file);
  });
}

/**
 * Upload a video to Mux with automatic retry on failure/timeout.
 * Creates a new upload URL on each retry to avoid expired URLs.
 */
export async function uploadToMuxWithRetry(opts: UploadOptions): Promise<string> {
  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Mux upload retry ${attempt}/${maxRetries}...`);
        // Brief delay before retry
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }

      // Get a fresh upload URL each attempt (previous may have expired)
      const { uploadId, uploadUrl } = await createMuxUpload({
        userId: opts.userId,
        title: opts.title,
        description: opts.description,
        isPublic: opts.isPublic,
      });

      await uploadFile(uploadUrl, opts.file, opts.onProgress, timeoutMs);
      return uploadId;
    } catch (err: any) {
      lastError = err;
      console.warn(`Mux upload attempt ${attempt + 1} failed: ${err.message}`);
      opts.onProgress?.(0); // Reset progress for retry
    }
  }

  throw new Error(`Upload failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}
