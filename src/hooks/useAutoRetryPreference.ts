import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "onboarding:auto_retry_enabled";
const DEFAULT_VALUE = true;

const readValue = (): boolean => {
  if (typeof window === "undefined") return DEFAULT_VALUE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_VALUE;
    return raw === "true";
  } catch {
    return DEFAULT_VALUE;
  }
};

/**
 * Persisted user preference: should onboarding submission failures
 * automatically retry after a short countdown?
 *
 * Backed by localStorage so it survives reloads and is shared across tabs.
 */
export function useAutoRetryPreference() {
  const [enabled, setEnabledState] = useState<boolean>(() => readValue());

  // Sync across tabs / windows
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabledState(readValue());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore quota errors
    }
  }, []);

  return { enabled, setEnabled };
}
