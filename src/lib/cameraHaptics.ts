import { Capacitor } from "@capacitor/core";

/**
 * Cross-platform haptic "tick" used when the camera mode changes.
 * - On iOS/Android (Capacitor): uses native ImpactStyle.Light
 * - On web/PWA: falls back to navigator.vibrate(8)
 */
export async function hapticTick() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
  } catch {
    // fall through to web
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(8);
    } catch {
      /* noop */
    }
  }
}

/** Stronger feedback for "start recording" / "publish" actions. */
export async function hapticImpact() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }
  } catch {
    /* noop */
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(20);
    } catch {
      /* noop */
    }
  }
}
