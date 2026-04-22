import posthog from "posthog-js";

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: "https://app.posthog.com",
    autocapture: false,
    capture_pageview: true,
  });
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export function resetPostHog() {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.reset();
}
