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
 * Result of validating an imported snapshot. `ok: true` includes the
 * normalized payload (numeric timestamps); `ok: false` includes a list of
 * human-readable errors describing exactly what's wrong.
 */
export type SnapshotValidationResult =
  | {
      ok: true;
      value: {
        toggles: Toggles;
        togglesChangedAt: ChangedAt;
      };
    }
  | { ok: false; errors: string[] };

export const PREFETCH_TARGETS = ["home", "landing"] as const;
const TARGETS = PREFETCH_TARGETS;

/**
 * Strict schema validator for snapshot JSON. Returns specific errors for
 * missing/malformed required keys so the UI can surface them clearly.
 *
 * Required shape:
 *   {
 *     toggles: { home: boolean, landing: boolean },
 *     togglesChangedAt: {
 *       home: string | number | null,
 *       landing: string | number | null
 *     }
 *   }
 */
export const validatePrefetchSnapshot = (
  input: unknown
): SnapshotValidationResult => {
  const errors: string[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["Snapshot root must be a JSON object."] };
  }

  const root = input as Record<string, unknown>;

  // toggles
  if (!("toggles" in root)) {
    errors.push("Missing required key: `toggles`.");
  } else if (
    typeof root.toggles !== "object" ||
    root.toggles === null ||
    Array.isArray(root.toggles)
  ) {
    errors.push("`toggles` must be an object with `home` and `landing` booleans.");
  }

  // togglesChangedAt
  if (!("togglesChangedAt" in root)) {
    errors.push("Missing required key: `togglesChangedAt`.");
  } else if (
    typeof root.togglesChangedAt !== "object" ||
    root.togglesChangedAt === null ||
    Array.isArray(root.togglesChangedAt)
  ) {
    errors.push(
      "`togglesChangedAt` must be an object with `home` and `landing` entries."
    );
  }

  if (errors.length > 0) return { ok: false, errors };

  const togglesIn = root.toggles as Record<string, unknown>;
  const changedIn = root.togglesChangedAt as Record<string, unknown>;
  const nextToggles: Toggles = { ...cache };
  const nextChangedAt: ChangedAt = { ...changedAtCache };

  TARGETS.forEach((target) => {
    if (!(target in togglesIn)) {
      errors.push(`\`toggles.${target}\` is required.`);
    } else if (typeof togglesIn[target] !== "boolean") {
      errors.push(
        `\`toggles.${target}\` must be a boolean (got ${typeof togglesIn[target]}).`
      );
    } else {
      nextToggles[target] = togglesIn[target] as boolean;
    }

    if (!(target in changedIn)) {
      errors.push(`\`togglesChangedAt.${target}\` is required (use null if unset).`);
      return;
    }
    const raw = changedIn[target];
    if (raw === null) {
      nextChangedAt[target] = null;
    } else if (typeof raw === "number" && Number.isFinite(raw)) {
      nextChangedAt[target] = raw;
    } else if (typeof raw === "string") {
      const parsed = Date.parse(raw);
      if (Number.isFinite(parsed)) {
        nextChangedAt[target] = parsed;
      } else {
        errors.push(
          `\`togglesChangedAt.${target}\` is not a parseable ISO date string.`
        );
      }
    } else {
      errors.push(
        `\`togglesChangedAt.${target}\` must be null, a number, or an ISO date string (got ${typeof raw}).`
      );
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { toggles: nextToggles, togglesChangedAt: nextChangedAt } };
};

/**
 * Bulk-apply toggle values and their changed-at timestamps. Used by the
 * dev-only "import snapshot" button. Validates the input first and returns
 * the validation result so callers can surface specific errors.
 */
export const importPrefetchToggles = (
  input: unknown
): SnapshotValidationResult => {
  if (!import.meta.env.DEV) {
    return { ok: false, errors: ["Import is only available in development."] };
  }
  const result = validatePrefetchSnapshot(input);
  if (!result.ok) return result;

  cache = result.value.toggles;
  changedAtCache = result.value.togglesChangedAt;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // no-op
  }
  persistChangedAt();
  dispatch();
  return result;
};
