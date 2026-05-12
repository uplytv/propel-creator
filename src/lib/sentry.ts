import * as Sentry from "@sentry/react";

const PII_KEYS = ["email", "password", "token", "api_key", "apiKey", "secret", "authorization", "auth"];

function scrubPII(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrubPII);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const low = k.toLowerCase();
    if (PII_KEYS.some((p) => low.includes(p))) {
      out[k] = "[Filtered]";
    } else if (v && typeof v === "object") {
      out[k] = scrubPII(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  initialized = true;

  const env = import.meta.env.VITE_SENTRY_ENVIRONMENT || (import.meta.env.PROD ? "production" : "development");

  Sentry.init({
    dsn,
    environment: env,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      try {
        if (event.request) {
          if (event.request.headers) event.request.headers = scrubPII(event.request.headers);
          if (event.request.data) event.request.data = scrubPII(event.request.data);
          if (event.request.query_string && typeof event.request.query_string === "string") {
            event.request.query_string = event.request.query_string.replace(
              /(email|token|password|api_key|secret)=[^&]+/gi,
              "$1=[Filtered]"
            );
          }
        }
        if (event.extra) event.extra = scrubPII(event.extra);
        if (event.contexts) event.contexts = scrubPII(event.contexts) as any;
      } catch {}
      return event;
    },
  });
}

export function setSentryUser(userId: string, traits?: Record<string, any>) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.setUser({ id: userId, ...(traits ? scrubPII(traits) : {}) });
}

export function clearSentryUser() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  Sentry.setUser(null);
}

export function captureError(error: unknown, context?: Record<string, any>) {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.error("[captureError]", error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: scrubPII(context) } : undefined);
}

export { Sentry };
