import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";

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

const BOOST_EVENTS = new Set([
  "boost_toast_shown",
  "boost_toast_action_clicked",
  "boost_toast_dismissed",
]);

async function persistBoostEvent(event: string, properties?: Record<string, any>) {
  try {
    const props = properties ?? {};
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      // unauthenticated is fine; insert policy allows anon
    }
    await supabase.from("boost_toast_events").insert({
      event_name: event,
      boost_state: String(props.boost_state ?? ""),
      boost_key: String(props.boost_key ?? ""),
      route: props.route ? String(props.route) : null,
      content_type: props.content_type ? String(props.content_type) : null,
      content_id: props.content_id ? String(props.content_id) : null,
      creator_id: props.creator_id ? String(props.creator_id) : null,
      via: props.via ? String(props.via) : null,
      user_id: userId,
    });
  } catch {
    // best-effort analytics — never throw to UI
  }
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (BOOST_EVENTS.has(event)) {
    void persistBoostEvent(event, properties);
  }
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export function resetPostHog() {
  if (!import.meta.env.VITE_POSTHOG_KEY) return;
  posthog.reset();
}
