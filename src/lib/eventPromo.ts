// Event promoter link attribution (?promo=CODE on event pages).
// Reuses the affiliateCookies storage pattern (cookie + localStorage backup)
// under a NEW event-scoped key, with a hard 7-day expiry embedded in the
// value so the localStorage fallback also expires.
//
// Tracking only — the code is validated server-side by finalize-ticket-order.

import { setAffiliateCookie, getAffiliateCookie, clearAffiliateCookie } from "./affiliateCookies";

const KEY_PREFIX = "uply_event_promo_";
const TTL_DAYS = 7;

const keyFor = (eventId: string) => `${KEY_PREFIX}${eventId}`;

/** Normalize a raw ?promo= value to the stored code format (UPPER, safe chars). */
export function normalizePromoCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
  return code.length >= 3 ? code : null;
}

/** Capture a promoter code for an event (7-day window, last click wins). */
export function captureEventPromoCode(eventId: string, rawCode: string): void {
  const code = normalizePromoCode(rawCode);
  if (!code || !eventId) return;
  const expiresAt = Date.now() + TTL_DAYS * 86400 * 1000;
  setAffiliateCookie(keyFor(eventId), `${code}|${expiresAt}`, TTL_DAYS);
}

/** Read the stored promoter code for an event; clears + returns null if expired. */
export function getEventPromoCode(eventId: string): string | null {
  if (!eventId) return null;
  const raw = getAffiliateCookie(keyFor(eventId));
  if (!raw) return null;
  const [code, expiry] = raw.split("|");
  if (!code || !expiry || Number(expiry) < Date.now()) {
    clearAffiliateCookie(keyFor(eventId));
    return null;
  }
  return normalizePromoCode(code);
}
