/**
 * Tiny global handoff store for media captured in the camera that the
 * post-capture editors need to consume. Avoids serializing huge Blobs
 * through router state.
 *
 * Lifecycle: written by /camera, read once by the editor route, then cleared.
 */
export type CapturedMediaKind = "photo" | "video";

export interface CapturedMedia {
  kind: CapturedMediaKind;
  blob: Blob;
  /** Display URL for preview (object URL — caller must revoke). */
  previewUrl: string;
  /** Width / height of the source media if known. */
  width?: number;
  height?: number;
  /** Duration in seconds (videos only). */
  durationSeconds?: number;
  /** Original filename, for imports. */
  fileName?: string;
  mimeType: string;
}

let stash: CapturedMedia | null = null;

export function setCapturedMedia(media: CapturedMedia) {
  // Revoke any previous preview URL we might still own
  if (stash?.previewUrl && stash.previewUrl !== media.previewUrl) {
    try {
      URL.revokeObjectURL(stash.previewUrl);
    } catch {
      /* noop */
    }
  }
  stash = media;
}

export function takeCapturedMedia(): CapturedMedia | null {
  const m = stash;
  stash = null;
  return m;
}

export function peekCapturedMedia(): CapturedMedia | null {
  return stash;
}
