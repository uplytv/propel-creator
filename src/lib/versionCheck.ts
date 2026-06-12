// Polls the deployed index.html for a changed build fingerprint and shows a
// persistent banner when a new version ships. Users choose when to reload.
//
// Strategy: fetch `/` with cache: 'no-store', extract the hashed entry script
// src (e.g. /assets/index-ABCD1234.js) from the HTML. If it changes vs. the
// fingerprint captured at app boot, show the banner.

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FOCUS_DEBOUNCE_MS = 60 * 1000;   // don't refetch more than once/min on focus

let bootFingerprint: string | null = null;
let lastCheck = 0;
let bannerShown = false;

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

function removeUpdateBanner() {
  const existing = document.getElementById("uply-update-banner");
  if (existing) existing.remove();
  bannerShown = false;
}

function showUpdateBanner() {
  if (bannerShown) return;
  bannerShown = true;

  const host = document.createElement("div");
  host.id = "uply-update-banner";
  host.setAttribute("role", "alert");
  host.setAttribute("aria-live", "polite");

  Object.assign(host.style, {
    position: "fixed",
    bottom: "0",
    left: "0",
    right: "0",
    zIndex: "9999",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 16px",
    background: "rgba(10,10,10,0.98)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    color: "#ffffff",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: "14px",
    lineHeight: "1.4",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
    backdropFilter: "blur(8px)",
  } as CSSStyleDeclaration);

  const text = document.createElement("span");
  text.textContent = "A new version of UPLY is available.";
  Object.assign(text.style, {
    flex: "1",
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as CSSStyleDeclaration);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.alignItems = "center";
  actions.style.gap = "8px";
  actions.style.flexShrink = "0";

  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Reload now";
  Object.assign(reloadBtn.style, {
    appearance: "none",
    border: "none",
    borderRadius: "8px",
    padding: "8px 14px",
    background: "#00FF85",
    color: "#0A0A0A",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    lineHeight: "1",
  } as CSSStyleDeclaration);

  reloadBtn.addEventListener("click", async () => {
    reloadBtn.textContent = "Updating…";
    reloadBtn.style.opacity = "0.7";
    reloadBtn.disabled = true;
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
  });

  const dismissBtn = document.createElement("button");
  dismissBtn.textContent = "Later";
  Object.assign(dismissBtn.style, {
    appearance: "none",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    padding: "8px 14px",
    background: "transparent",
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    fontSize: "13px",
    cursor: "pointer",
    lineHeight: "1",
  } as CSSStyleDeclaration);

  dismissBtn.addEventListener("click", () => {
    removeUpdateBanner();
  });

  actions.appendChild(dismissBtn);
  actions.appendChild(reloadBtn);
  host.appendChild(text);
  host.appendChild(actions);
  document.body.appendChild(host);
}

async function checkAndNotify() {
  if (bannerShown) return;
  const now = Date.now();
  if (now - lastCheck < FOCUS_DEBOUNCE_MS) return;
  lastCheck = now;

  const current = await fetchCurrentFingerprint();
  if (!current || !bootFingerprint) return;
  if (current !== bootFingerprint) {
    showUpdateBanner();
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
  setInterval(checkAndNotify, POLL_INTERVAL_MS);

  // Check when the tab regains focus or comes back online.
  window.addEventListener("focus", checkAndNotify);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkAndNotify();
  });
  window.addEventListener("online", checkAndNotify);
}
