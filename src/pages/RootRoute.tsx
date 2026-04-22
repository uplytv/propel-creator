import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

// Cache the dynamic imports so we can both lazy-load and imperatively prefetch
// the same module without triggering a second network request.
const homeImport = () => import("./Home");
const landingImport = () => import("./Landing");

const Home = lazy(homeImport);
const Landing = lazy(landingImport);

// Track which route bundles have been requested so we never double-prefetch.
const prefetchedRoutes = {
  home: false,
  landing: false,
};

// Track in-flight prefetch AbortControllers so we can actually cancel a
// stalled chunk fetch instead of letting it linger in the background.
const prefetchControllers: Record<"home" | "landing", AbortController | null> = {
  home: null,
  landing: null,
};

const prefetchLog = (msg: string, data?: unknown) => {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.log(`[RootRoute prefetch] ${msg}`, data ?? "");
};

const isSlowOrSavingData = (): { skip: boolean; reason?: string; effectiveType?: string } => {
  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;

  if (conn?.saveData) {
    return { skip: true, reason: "saveData", effectiveType: conn.effectiveType };
  }
  if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) {
    return { skip: true, reason: "slow-connection", effectiveType: conn.effectiveType };
  }
  return { skip: false, effectiveType: conn?.effectiveType };
};

/**
 * Prefetch a single target route bundle. Skips if already warmed, the
 * connection is save-data / 2g, or the tab is not currently visible — in
 * the hidden case we defer until the tab becomes visible again so background
 * tabs don't burn user data.
 */
const prefetchTarget = (target: "home" | "landing", reason: string) => {
  if (typeof window === "undefined") return;
  if (prefetchedRoutes[target]) {
    prefetchLog(`skipped: ${target} already prefetched`, { reason });
    return;
  }

  const { skip, reason: skipReason, effectiveType } = isSlowOrSavingData();
  if (skip) {
    prefetchLog(`skipped: ${skipReason}`, { effectiveType, target, reason });
    return;
  }

  // Defer prefetch when the tab isn't visible. Re-attempt on the next
  // visibility change. This avoids wasting bandwidth on background tabs
  // (e.g. user opened the app in a new tab and switched away).
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    prefetchLog(`deferred: tab not visible (${document.visibilityState})`, {
      target,
      reason,
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        document.removeEventListener("visibilitychange", onVisible);
        prefetchTarget(target, `${reason}+visibility`);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return;
  }

  prefetchedRoutes[target] = true;
  prefetchLog(`running ${target} (${reason})`, { effectiveType });
  const importer = target === "home" ? homeImport : landingImport;

  // Short timeout so a stalled network doesn't keep an in-flight chunk
  // request hanging forever. If we time out, mark the route as not
  // prefetched so a later trigger (visibility, navigation) can retry.
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    prefetchedRoutes[target] = false;
    prefetchLog(`timeout: ${target} prefetch aborted after ${PREFETCH_TIMEOUT_MS}ms`, {
      target,
      reason,
    });
  }, PREFETCH_TIMEOUT_MS);

  importer()
    .then(() => {
      if (timedOut) {
        // Late success after timeout — keep the module (browser cached it),
        // but log so we can see stalls in dev.
        prefetchedRoutes[target] = true;
        prefetchLog(`late success: ${target} resolved after timeout`, { target });
      }
    })
    .catch(() => {
      prefetchedRoutes[target] = false;
      prefetchLog(`failed: ${target} import error`, { target });
    })
    .finally(() => {
      window.clearTimeout(timeoutId);
    });
};

const PREFETCH_TIMEOUT_MS = 4000;

const AUTH_RESOLVE_TIMEOUT_MS = 8000;

// Adaptive skeleton delay configuration.
// We persist the most recent measured auth resolve duration to localStorage
// and use it on the next mount to pick a skeleton delay that's:
//   - near-zero for cached/instant sessions (avoids any flash)
//   - moderate for typical network sessions
//   - longer for known-slow sessions (avoids skeleton "blinking on" right
//     before content arrives)
const SKELETON_DELAY_DEFAULT_MS = 150;
const SKELETON_DELAY_MIN_MS = 60;
const SKELETON_DELAY_MAX_MS = 600;
const AUTH_DURATION_STORAGE_KEY = "uply:lastAuthResolveMs";

const readLastAuthDurationMs = (): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_DURATION_STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
};

const persistAuthDurationMs = (ms: number) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_DURATION_STORAGE_KEY, String(ms));
  } catch {
    // storage might be disabled (private mode) — fail silently
  }
};

/**
 * Pick a skeleton delay based on last measured auth duration.
 * Strategy: wait ~80% of the previous resolve time, clamped to a sane range.
 * This means cached sessions (~20ms) hide the skeleton entirely, while
 * slow sessions (~3s) wait long enough that the skeleton represents a
 * meaningful loading state instead of a brief flash.
 */
const computeAdaptiveSkeletonDelay = (lastMs: number | null): number => {
  if (lastMs == null) return SKELETON_DELAY_DEFAULT_MS;
  const target = Math.round(lastMs * 0.8);
  return Math.min(SKELETON_DELAY_MAX_MS, Math.max(SKELETON_DELAY_MIN_MS, target));
};

const Loader = () => <PageSkeleton />;

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0A0A0A] px-6 text-center text-white">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl">
      ⚠️
    </div>
    <div className="space-y-2 max-w-sm">
      <h1 className="text-xl font-semibold">We couldn't load your session</h1>
      <p className="text-sm text-white/60">{message}</p>
    </div>
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={onRetry}
        className="rounded-full bg-[#00FF85] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#00FF85]/90 transition"
      >
        Try again
      </button>
      <a
        href="/welcome"
        className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition"
      >
        Continue as guest
      </a>
    </div>
  </div>
);

// Buckets for slicing slow-session telemetry without leaking exact timings.
const bucketAuthDuration = (ms: number): string => {
  if (ms < 100) return "instant";
  if (ms < 300) return "fast";
  if (ms < 800) return "normal";
  if (ms < 2000) return "slow";
  if (ms < 5000) return "very_slow";
  return "timeout_risk";
};

export default function RootRoute() {
  const { user, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [redirectGuest, setRedirectGuest] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Capture the moment this RootRoute mount began waiting on auth, so we can
  // measure how long resolution takes (cached vs network vs slow session).
  const authStartRef = useRef<number>(performance.now());
  const reportedRef = useRef(false);
  // Captures the moment auth resolved, so we can measure time-to-render of
  // the actual Home/Landing content vs. the loading state.
  const authResolvedAtRef = useRef<number | null>(null);
  const renderReportedRef = useRef(false);

  // Skeleton display tracking — used to verify the flash fix in production.
  const skeletonShownAtRef = useRef<number | null>(null);
  const skeletonShownDurationRef = useRef<number>(0);
  const skeletonWasShownRef = useRef<boolean>(false);

  // Adaptive skeleton delay: derived from last-known auth resolve time.
  const skeletonDelayRef = useRef<number>(
    computeAdaptiveSkeletonDelay(readLastAuthDurationMs())
  );

  // Reset measurement when the user retries.
  useEffect(() => {
    authStartRef.current = performance.now();
    reportedRef.current = false;
    authResolvedAtRef.current = null;
    renderReportedRef.current = false;
    skeletonShownAtRef.current = null;
    skeletonShownDurationRef.current = 0;
    skeletonWasShownRef.current = false;
    skeletonDelayRef.current = computeAdaptiveSkeletonDelay(
      readLastAuthDurationMs()
    );
  }, [retryKey]);

  // Emit a one-shot timing event when auth flips from loading -> resolved.
  useEffect(() => {
    if (loading || reportedRef.current) return;
    reportedRef.current = true;
    authResolvedAtRef.current = performance.now();

    // Targeted prefetch: only warm the bundle we're actually about to render.
    // Saves bandwidth vs. eagerly prefetching both Home and Landing.
    prefetchTarget(user ? "home" : "landing", "auth-resolved");

    // Finalize skeleton timing if it was on screen at resolve time.
    if (skeletonShownAtRef.current != null) {
      skeletonShownDurationRef.current +=
        performance.now() - skeletonShownAtRef.current;
      skeletonShownAtRef.current = null;
    }
    const skeletonShownMs = Math.round(skeletonShownDurationRef.current);

    const durationMs = Math.round(performance.now() - authStartRef.current);
    const bucket = bucketAuthDuration(durationMs);
    // A "flash" = skeleton appeared but for less than ~250ms (perceptual
    // threshold). If this number stays near zero in production, the fix works.
    const skeletonWasFlash =
      skeletonWasShownRef.current && skeletonShownMs > 0 && skeletonShownMs < 250;

    const payload = {
      duration_ms: durationMs,
      bucket,
      authenticated: !!user,
      had_error: !!authError,
      skeleton_shown: skeletonWasShownRef.current,
      skeleton_shown_ms: skeletonShownMs,
      skeleton_delay_ms: skeletonDelayRef.current,
      skeleton_was_flash: skeletonWasFlash,
    };

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(
        `[RootRoute auth] resolved in ${durationMs}ms (${bucket}) — skeleton ${
          skeletonWasShownRef.current
            ? `shown for ${skeletonShownMs}ms${skeletonWasFlash ? " ⚠ FLASH" : ""}`
            : "not shown ✓"
        } — adaptive delay was ${skeletonDelayRef.current}ms`,
        payload
      );
    }

    // Persist for the next mount so we can pick a smarter skeleton delay.
    persistAuthDurationMs(durationMs);

    // Soft analytics dispatch — works with anything that listens for the
    // CustomEvent (Segment shim, Plausible custom prop, GA4 listener, etc.)
    // and falls back gracefully when no listener is attached.
    try {
      window.dispatchEvent(
        new CustomEvent("uply:auth_resolved", { detail: payload })
      );
    } catch {
      // no-op
    }
  }, [loading, user, authError]);

  // Delay skeleton display using the adaptive delay derived from the last
  // measured auth resolve time. Cached sessions get ~60ms, slow sessions
  // get up to 600ms before the skeleton appears.
  useEffect(() => {
    if (!loading) {
      // Auth resolved while skeleton might be visible — capture how long it
      // was on screen for the upcoming telemetry event.
      if (skeletonShownAtRef.current != null) {
        skeletonShownDurationRef.current +=
          performance.now() - skeletonShownAtRef.current;
        skeletonShownAtRef.current = null;
      }
      setShowSkeleton(false);
      return;
    }
    const id = window.setTimeout(() => {
      setShowSkeleton(true);
      skeletonWasShownRef.current = true;
      skeletonShownAtRef.current = performance.now();
    }, skeletonDelayRef.current);
    return () => window.clearTimeout(id);
  }, [loading, retryKey]);

  // Time-to-render: measures the gap between auth resolution and the actual
  // commit + paint of Home/Landing. Useful for spotting slow lazy-loaded
  // bundles or hydration cost.
  useEffect(() => {
    if (loading || authError) return;
    if (renderReportedRef.current) return;
    if (authResolvedAtRef.current == null) return;
    renderReportedRef.current = true;

    const resolvedAt = authResolvedAtRef.current;
    // Wait for the next paint so we measure perceived render, not just commit.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        const ttrMs = Math.round(performance.now() - resolvedAt);
        const target = user ? "home" : "landing";
        const renderPayload = {
          ttr_ms: ttrMs,
          target,
          authenticated: !!user,
        };

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log(
            `[RootRoute render] ${target} painted ${ttrMs}ms after auth resolved`,
            renderPayload
          );
        }

        try {
          window.dispatchEvent(
            new CustomEvent("uply:root_rendered", { detail: renderPayload })
          );
        } catch {
          // no-op
        }
      });
      // Cleanup nested raf in case of unmount between frames.
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [loading, user, authError]);

  // Probe the session ourselves so we can surface real errors and timeouts.
  useEffect(() => {
    let cancelled = false;
    setAuthError(null);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      if (loading) {
        setAuthError(
          "Authentication is taking longer than expected. Check your connection and try again."
        );
      }
    }, AUTH_RESOLVE_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setAuthError(
            error.message ||
              "Something went wrong while loading your session."
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Network error while loading your session.";
        setAuthError(msg);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [loading, retryKey]);

  const handleRetry = useCallback(() => {
    setAuthError(null);
    setRetryKey((k) => k + 1);
  }, []);

  if (redirectGuest) return <Navigate to="/welcome" replace />;

  if (authError) {
    // Hand off to the dedicated /auth-retry route so the retry flow doesn't
    // remount RootRoute (which would re-trigger skeleton timing & prefetch).
    return <Navigate to="/auth-retry" replace state={{ from: "/", message: authError }} />;
  }

  // Wait fully for auth to resolve. Render nothing for the first ~150ms to
  // avoid a skeleton flash on cached sessions; then show the skeleton.
  if (loading) return showSkeleton ? <Loader /> : null;

  return (
    <Suspense fallback={<Loader />}>
      {user ? <Home /> : <Landing />}
    </Suspense>
  );
}
