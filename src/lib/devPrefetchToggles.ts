/**
 * Dev-only runtime toggles for route prefetching. Persisted to localStorage
 * so the choice survives reloads. In production these always return `true`
 * and writes are no-ops — the toggles only have effect in development.
 */
export type PrefetchTarget = "home" | "landing";

const STORAGE_KEY = "uply:devPrefetchToggles";
export const PREFETCH_TOGGLES_EVENT = "uply:prefetch_toggles_changed";

type Toggles = Record<PrefetchTarget, boolean>;

const defaults: Toggles = { home: true, landing: true };

const readToggles = (): Toggles => {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Toggles>;
    return {
      home: parsed.home !== false,
      landing: parsed.landing !== false,
    };
  } catch {
    return defaults;
  }
};

let cache: Toggles = readToggles();

export const isPrefetchEnabled = (target: PrefetchTarget): boolean => {
  if (!import.meta.env.DEV) return true;
  return cache[target];
};

export const getPrefetchToggles = (): Toggles => ({ ...cache });

export const setPrefetchToggle = (target: PrefetchTarget, enabled: boolean) => {
  if (!import.meta.env.DEV) return;
  cache = { ...cache, [target]: enabled };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage disabled — fail silently
  }
  try {
    window.dispatchEvent(
      new CustomEvent(PREFETCH_TOGGLES_EVENT, { detail: { ...cache } })
    );
  } catch {
    // no-op
  }
};
