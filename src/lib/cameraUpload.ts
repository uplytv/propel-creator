import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a Blob to Mux via the existing `mux-create-upload` edge function,
 * which mirrors the path used by Broadcast Studio. The mux-webhook then
 * promotes the asset to a `videos` row when it becomes ready.
 *
 * Returns { uploadId } so the caller can show progress / poll completion.
 */
export async function uploadVideoBlob(opts: {
  userId: string;
  title: string;
  description?: string;
  blob: Blob;
  onProgress?: (pct: number) => void;
}): Promise<{ uploadId: string }> {
  const { data, error } = await supabase.functions.invoke("mux-create-upload", {
    body: {
      userId: opts.userId,
      title: opts.title,
      description: opts.description || "",
    },
  });
  if (error) throw new Error(error.message || "Failed to create upload");
  const uploadUrl: string = data.uploadUrl;
  const uploadId: string = data.uploadId;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        opts.onProgress?.((e.loaded / e.total) * 100);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(opts.blob);
  });

  return { uploadId };
}

/** Upload a still image to the public 'stories' bucket and return its URL. */
export async function uploadImageBlob(opts: {
  userId: string;
  blob: Blob;
  bucket?: string;
  ext?: string;
}): Promise<string> {
  const bucket = opts.bucket || "stories";
  const ext = opts.ext || (opts.blob.type.split("/")[1] ?? "jpg");
  const path = `${opts.userId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, opts.blob, { contentType: opts.blob.type, upsert: false });
  if (error) throw error;
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return pub.publicUrl;
}
