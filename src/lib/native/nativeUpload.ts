import { isNative } from "./platform";

/**
 * Native-friendly Mux upload. On iOS/Android we use the Capacitor HTTP layer
 * (no CORS, background-safe). On web we fall back to a standard PUT with
 * progress (UpChunk is used elsewhere for resumable uploads).
 */
export async function uploadToMuxNative(opts: {
  uploadUrl: string;
  file: Blob;
  onProgress?: (pct: number) => void;
}): Promise<void> {
  if (isNative()) {
    // CapacitorHttp doesn't stream progress, but it bypasses WebView CORS.
    const { CapacitorHttp } = await import("@capacitor/core");
    const buf = await opts.file.arrayBuffer();
    // Convert to base64 for the bridge
    const base64 = arrayBufferToBase64(buf);
    opts.onProgress?.(10);
    await CapacitorHttp.request({
      url: opts.uploadUrl,
      method: "PUT",
      headers: { "Content-Type": opts.file.type || "application/octet-stream" },
      data: base64,
      dataType: "base64" as never,
    });
    opts.onProgress?.(100);
    return;
  }

  // Web fallback: XHR PUT with progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", opts.uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      opts.file.type || "application/octet-stream"
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.((e.loaded / e.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(opts.file);
  });
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return btoa(binary);
}
