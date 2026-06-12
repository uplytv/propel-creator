// Polls the deployed index.html for a changed build fingerprint and forces a
// hard reload when a new version ships. This catches users sitting on a stale
// tab after a deploy (where the SW autoUpdate hasn't fired yet, or where the
// browser is holding onto a cached entry chunk).
//
// Strategy: fetch `/` with cache: 'no-store', extract the hashed entry script
// src (e.g. /assets/index-ABCD1234.js) from the HTML. If it changes vs. the
// fingerprint captured at app boot, reload.

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FOCUS_DEBOUNCE_MS = 60 * 1000;     // don't refetch more than once/min on focus

let bootFingerprint: string | null = null;
let lastCheck = 0;
let reloading = false;

function extractFingerprint(html: string): string | null {
  // Match the main module script Vite injects, e.g.
  //   <script type="module" crossorigin src="/assets/index-AbCd1234.js"></script>
  const m = html.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/i);
  return m ? m[1] : null;
}

async function fetchCurrentFingerprint(): Promise<string | null> {
  try {
    const res = await fetch("/", {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractFingerprint(html);
  } catch {
    return null;
  }
}

async function checkAndMaybeReload() {
  if (reloading) return;
  const now = Date.now();
  if (now - lastCheck < FOCUS_DEBOUNCE_MS) return;
  lastCheck = now;

  const current = await fetchCurrentFingerprint();
  if (!current || !bootFingerprint) return;
  if (current !== bootFingerprint) {
    reloading = true;
    // Best-effort: drop SW caches so the reload pulls fresh assets.
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.update().catch(() => {})));
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n).catch(() => false)));
      }
    } catch {
      // ignore
    }
    window.location.reload();
  }
}

export function initVersionCheck() {
  // Only run on real deployed origins. Skip dev, iframe preview, lovable preview.
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return;
  const host = window.location.hostname;
  const isPreview =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovableproject-dev.com");
  if (isPreview) return;
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  if (inIframe) return;

  // Capture the fingerprint of the build the user is currently running.
  fetchCurrentFingerprint().then(fp => { bootFingerprint = fp; });

  // Periodic check.
  setInterval(checkAndMaybeReload, POLL_INTERVAL_MS);

  // Check when the tab regains focus or comes back online — most likely
  // moments for a user to be on a stale build after a fresh deploy.
  window.addEventListener("focus", checkAndMaybeReload);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkAndMaybeReload();
  });
  window.addEventListener("online", checkAndMaybeReload);
}
