export type CameraMode = "POST" | "STORY" | "SHORT" | "VIDEO" | "LIVE";

export const CAMERA_MODES: CameraMode[] = [
  "POST",
  "STORY",
  "SHORT",
  "VIDEO",
  "LIVE",
];

export const MODE_EMOJI: Record<CameraMode, string> = {
  POST: "📸",
  STORY: "✨",
  SHORT: "📱",
  VIDEO: "🎬",
  LIVE: "🔴",
};

export const MODE_DESCRIPTION: Record<CameraMode, string> = {
  POST: "Photo to your feed",
  STORY: "Disappears in 24h",
  SHORT: "Vertical · 60s max",
  VIDEO: "Long-form video",
  LIVE: "Go live now",
};

/** Max recording duration in seconds, per mode. */
export const MODE_MAX_SECONDS: Record<CameraMode, number> = {
  POST: 0, // photo
  STORY: 60,
  SHORT: 60,
  VIDEO: 60 * 60, // 60 minutes
  LIVE: 0, // n/a, hands off to live pipeline
};

/** Forced aspect ratio for the camera viewfinder, per mode. */
export const MODE_ASPECT_RATIO: Record<CameraMode, "9:16" | "1:1" | "4:5" | "free"> = {
  POST: "4:5",
  STORY: "9:16",
  SHORT: "9:16",
  VIDEO: "free",
  LIVE: "free",
};

export const POST_CAPTURE_ROUTE: Record<CameraMode, string> = {
  POST: "/create/post/editor",
  STORY: "/create/story/editor",
  SHORT: "/create/short/editor",
  VIDEO: "/create/video/editor",
  LIVE: "/go-live",
};
