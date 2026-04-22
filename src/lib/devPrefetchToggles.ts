/**
 * Dev-only runtime toggles for route prefetching. Persisted to localStorage
 * so the choice survives reloads. In production these always return `true`
 * and writes are no-ops — the toggles only have effect in development.
 */
export type PrefetchTarget = "home" | "landing";

const STORAGE_KEY = "uply:devPrefetchToggles";
const STORAGE_KEY_CHANGED = "uply:devPrefetchTogglesChangedAt";
export const PREFETCH_TOGGLES_EVENT = "uply:prefetch_toggles_changed";

type Toggles = Record<PrefetchTarget, boolean>;
type ChangedAt = Record<PrefetchTarget, number | null>;

const defaults: Toggles = { home: true, landing: true };
const defaultsChangedAt: ChangedAt = { home: null, landing: null };

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

const readChangedAt = (): ChangedAt => {
  if (typeof window === "undefined") return defaultsChangedAt;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CHANGED);
    if (!raw) return defaultsChangedAt;
    const parsed = JSON.parse(raw) as Partial<Record<PrefetchTarget, number>>;
    return {
      home: typeof parsed.home === "number" ? parsed.home : null,
      landing: typeof parsed.landing === "number" ? parsed.landing : null,
    };
  } catch {
    return defaultsChangedAt;
  }
};

let cache: Toggles = readToggles();
let changedAtCache: ChangedAt = readChangedAt();

const persistChangedAt = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY_CHANGED, JSON.stringify(changedAtCache));
  } catch {
    // no-op
  }
};

const dispatch = () => {
  try {
    window.dispatchEvent(
      new CustomEvent(PREFETCH_TOGGLES_EVENT, {
        detail: { toggles: { ...cache }, changedAt: { ...changedAtCache } },
      })
    );
  } catch {
    // no-op
  }
};

export const isPrefetchEnabled = (target: PrefetchTarget): boolean => {
  if (!import.meta.env.DEV) return true;
  return cache[target];
};

export const getPrefetchToggles = (): Toggles => ({ ...cache });

export const getPrefetchTogglesChangedAt = (): ChangedAt => ({ ...changedAtCache });

export const setPrefetchToggle = (target: PrefetchTarget, enabled: boolean) => {
  if (!import.meta.env.DEV) return;
  cache = { ...cache, [target]: enabled };
  changedAtCache = { ...changedAtCache, [target]: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage disabled — fail silently
  }
  persistChangedAt();
  dispatch();
};

export const resetPrefetchToggles = () => {
  if (!import.meta.env.DEV) return;
  const now = Date.now();
  cache = { home: true, landing: true };
  changedAtCache = { home: now, landing: now };
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
  persistChangedAt();
  dispatch();
};

/**
 * Bulk-apply toggle values and their changed-at timestamps. Used by the
 * dev-only "import snapshot" button. Unknown targets are ignored.
 */
export const importPrefetchToggles = (input: {
  toggles?: Partial<Toggles>;
  togglesChangedAt?: Partial<Record<PrefetchTarget, number | string | null>>;
}) => {
  if (!import.meta.env.DEV) return;
  const nextToggles: Toggles = { ...cache };
  const nextChangedAt: ChangedAt = { ...changedAtCache };

  (["home", "landing"] as const).forEach((target) => {
    if (input.toggles && typeof input.toggles[target] === "boolean") {
      nextToggles[target] = input.toggles[target] as boolean;
    }
    const raw = input.togglesChangedAt?.[target];
    if (raw == null) return;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      nextChangedAt[target] = raw;
    } else if (typeof raw === "string") {
      const parsed = Date.parse(raw);
      if (Number.isFinite(parsed)) nextChangedAt[target] = parsed;
    }
  });

  cache = nextToggles;
  changedAtCache = nextChangedAt;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // no-op
  }
  persistChangedAt();
  dispatch();
};
