import { Capacitor } from "@capacitor/core";

/**
 * Open the device's photo/video picker. On native (Capacitor) we use the
 * Camera plugin's photo picker; on web we fall back to a hidden file input.
 *
 * Returns the picked File (single-select for SHORT/STORY modes; multi-select
 * is intentionally deferred until POST mode needs carousel editing).
 */
export async function pickFromCameraRoll(opts?: {
  acceptVideo?: boolean;
  acceptImage?: boolean;
}): Promise<File | null> {
  const acceptVideo = opts?.acceptVideo ?? true;
  const acceptImage = opts?.acceptImage ?? true;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Camera } = await import("@capacitor/camera");
      const photo = await Camera.pickImages({ quality: 90, limit: 1 });
      const first = photo.photos?.[0];
      if (first?.webPath) {
        const res = await fetch(first.webPath);
        const blob = await res.blob();
        const ext = first.format || "jpg";
        return new File([blob], `import-${Date.now()}.${ext}`, { type: blob.type });
      }
      return null;
    } catch {
      // Fall through to web picker
    }
  }

  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    const accepts: string[] = [];
    if (acceptImage) accepts.push("image/*");
    if (acceptVideo) accepts.push("video/*");
    input.accept = accepts.join(",");
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Probe a video file for duration + dimensions without uploading. */
export function probeVideoFile(
  file: File
): Promise<{ durationSeconds: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = url;
    v.onloadedmetadata = () => {
      const data = {
        durationSeconds: v.duration || 0,
        width: v.videoWidth || 0,
        height: v.videoHeight || 0,
      };
      URL.revokeObjectURL(url);
      resolve(data);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
  });
}
