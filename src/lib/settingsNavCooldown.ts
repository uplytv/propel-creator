/**
 * Shared helpers for the Onboarding "Try again" cooldown that gates
 * navigation retries to /settings. Extracted so the cooldown / countdown /
 * progress-bar logic can be unit-tested without rendering the full page.
 */

export const SETTINGS_NAV_COOLDOWN_MS = 2000;
export const SETTINGS_NAV_COOLDOWN_KEY = "onboarding:settings_nav_last_attempt";

export const readSettingsNavLast = (): number => {
  try {
    const raw = sessionStorage.getItem(SETTINGS_NAV_COOLDOWN_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
};

export const writeSettingsNavLast = (ts: number): void => {
  try {
    sessionStorage.setItem(SETTINGS_NAV_COOLDOWN_KEY, String(ts));
  } catch {
    // ignore (e.g. storage disabled)
  }
};

export interface CooldownState {
  remainingMs: number;
  remainingSec: number;
  ready: boolean;
  /** Percentage of the cooldown that has elapsed (0–100). */
  elapsedPct: number;
  /** Label for the toast action button. */
  actionLabel: string;
}

/**
 * Compute the current cooldown state given the last attempt timestamp.
 * Pure function — easy to unit test.
 */
export const computeCooldownState = (
  lastAttemptMs: number,
  now: number = Date.now(),
  cooldownMs: number = SETTINGS_NAV_COOLDOWN_MS,
): CooldownState => {
  const remainingMs = Math.max(0, lastAttemptMs + cooldownMs - now);
  const ready = remainingMs <= 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const elapsedPct = ready
    ? 100
    : Math.min(100, Math.max(0, ((cooldownMs - remainingMs) / cooldownMs) * 100));
  const actionLabel = ready ? "Try again" : `Try again (${remainingSec}s)`;
  return { remainingMs, remainingSec, ready, elapsedPct, actionLabel };
};
