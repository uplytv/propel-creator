import { isNative, platformName } from "./platform";
import { supabase } from "@/integrations/supabase/client";

/**
 * Register the device for push notifications and persist the token to `push_tokens`.
 *
 * Native iOS/Android: uses @capacitor/push-notifications (APNs / FCM).
 * Web: falls back to the existing service worker + Web Push subscription
 *      (handled separately by usePushNotifications hook for web).
 *
 * Safe to call multiple times — upserts on (user_id, token).
 */
export async function registerNativePush(userId: string): Promise<void> {
  if (!isNative()) return;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const perm = await PushNotifications.checkPermissions();
  let status = perm.receive;
  if (status === "prompt" || status === "prompt-with-rationale") {
    const req = await PushNotifications.requestPermissions();
    status = req.receive;
  }
  if (status !== "granted") return;

  await PushNotifications.register();

  // Token arrives async via 'registration' event
  PushNotifications.addListener("registration", async (token) => {
    try {
      await supabase.from("push_tokens").upsert(
        {
          user_id: userId,
          token: token.value,
          platform: platformName(),
          device_info: {
            userAgent: navigator.userAgent,
            language: navigator.language,
          },
        },
        { onConflict: "user_id,token" }
      );
    } catch (err) {
      console.error("[push] failed to persist token", err);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("[push] registration error", err);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("[push] received", notification);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const url = (action.notification.data as { url?: string })?.url;
    if (url) window.location.href = url;
  });
}
