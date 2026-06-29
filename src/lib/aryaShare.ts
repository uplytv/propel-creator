// Cache-busting helpers for Arya XO share links.
// iMessage / WhatsApp / Slack aggressively cache previews by URL — so we
// append a fresh `?v=` param on every share, and propagate it into the
// og:image URL so the messenger refetches the artwork too.

export const ARYA_OG_BASE = "https://uply.tv/arya-xo-og-v3.png";
export const ARYA_OG_BUILD_VERSION = "20260629b"; // bump on artwork changes

/** Returns a fresh version token for a new share action. */
export function freshShareVersion(): string {
  return `${ARYA_OG_BUILD_VERSION}-${Date.now().toString(36)}`;
}

/** Build a versioned share URL for an Arya page. `path` should start with "/". */
export function buildAryaShareUrl(path: string, version?: string): string {
  const v = version ?? freshShareVersion();
  const sep = path.includes("?") ? "&" : "?";
  return `https://uply.tv${path}${sep}v=${encodeURIComponent(v)}`;
}

/** Build the versioned OG image URL. */
export function buildAryaOgImageUrl(version?: string): string {
  const v = version ?? ARYA_OG_BUILD_VERSION;
  return `${ARYA_OG_BASE}?v=${encodeURIComponent(v)}`;
}

/** Read `?v=` from the current location, falling back to the build version. */
export function currentOgVersion(): string {
  if (typeof window === "undefined") return ARYA_OG_BUILD_VERSION;
  const v = new URLSearchParams(window.location.search).get("v");
  return v && v.length <= 64 ? v : ARYA_OG_BUILD_VERSION;
}
