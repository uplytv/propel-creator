import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  initialized = true;

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    person_profiles: "identified_only",
    autocapture: false,
    disable_session_recording: true,
  });
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  try {
    posthog.identify(userId, properties);
  } catch {}
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!import.meta.env.VITE_POSTHOG_KEY) {
    if (import.meta.env.DEV) console.debug("[track]", event, properties);
    return;
  }
  try {
    posthog.capture(event, properties);
  } catch {}
}

export function resetUser() {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  try {
    posthog.reset();
  } catch {}
}

// Back-compat alias
export const resetPostHog = resetUser;

export function capturePageView(path?: string) {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  try {
    posthog.capture("$pageview", path ? { $current_url: window.location.origin + path } : undefined);
  } catch {}
}
