import { Capacitor } from "@capacitor/core";

/**
 * Single source of truth for native vs. web detection.
 * Every feature with a native equivalent should branch on `isNative()`.
 */
export const isNative = (): boolean => Capacitor.isNativePlatform();
export const isIOS = (): boolean => Capacitor.getPlatform() === "ios";
export const isAndroid = (): boolean => Capacitor.getPlatform() === "android";
export const isWeb = (): boolean => Capacitor.getPlatform() === "web";

export const platformName = (): "ios" | "android" | "web" => {
  const p = Capacitor.getPlatform();
  if (p === "ios" || p === "android") return p;
  return "web";
};

/** Best-effort haptic that won't throw on iOS Safari (which has no Vibration API). */
export async function lightHaptic(): Promise<void> {
  if (isNative()) {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    } catch {
      /* fall through */
    }
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(10);
    } catch {
      /* iOS Safari: silently ignore */
    }
  }
}
