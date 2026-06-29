import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";
// Editorial type system: Fraunces (display serif) + Inter (UI/body).
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { initSentry } from "./lib/sentry";
import { initPostHog } from "./lib/posthog";
import { initVersionCheck } from "./lib/versionCheck";

// Initialize monitoring
initSentry();
initPostHog();

// Show a "new version" banner when a new build is deployed.
initVersionCheck();

// Recover from stale code-split chunks after a deploy: if a lazy chunk fails to
// load (its hashed filename no longer exists on the new build), reload ONCE to
// fetch the fresh index.html instead of showing a blank screen.
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  const KEY = "uply_chunk_reload_at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last < 10000) return; // already reloaded recently — avoid a loop
  sessionStorage.setItem(KEY, String(Date.now()));
  window.location.reload();
});
// Same recovery for the generic ChunkLoadError some browsers throw.
window.addEventListener("error", (e) => {
  if (/ChunkLoadError|Loading chunk [\d]+ failed|dynamically imported module/i.test(e?.message || "")) {
    const KEY = "uply_chunk_reload_at";
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

// Register service worker for push notifications and offline (production only)
if ('serviceWorker' in navigator) {
  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");
  if (!isInIframe && !isPreviewHost && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  } else {
    navigator.serviceWorker?.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }
}

// Online/offline detection
window.addEventListener('offline', () => document.body.classList.add('app-offline'));
window.addEventListener('online', () => document.body.classList.remove('app-offline'));

// Always wrap in an error boundary so a runtime crash shows a recovery screen
// instead of a black/blank page (previously this only applied when a Sentry DSN
// was configured).
const SentryApp = Sentry.withErrorBoundary(App, {
  fallback: (
    <div className="flex min-h-screen items-center justify-center bg-background p-8 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">Please reload — if it persists we'll have been notified.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium">
          Reload Page
        </button>
      </div>
    </div>
  ),
});

createRoot(document.getElementById("root")!).render(<SentryApp />);
