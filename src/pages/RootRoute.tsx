import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Home = lazy(() => import("./Home"));
const Landing = lazy(() => import("./Landing"));

const AUTH_RESOLVE_TIMEOUT_MS = 8000;
// Wait a tick before showing the skeleton — avoids a flash when auth resolves
// from cached session synchronously or within a frame.
const SKELETON_DELAY_MS = 150;

const Loader = () => (
  <div className="min-h-screen bg-[#0A0A0A] text-white animate-pulse">
    {/* Navbar skeleton */}
    <div className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-md bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
      </div>
      <div className="hidden md:flex items-center gap-6">
        <div className="h-3 w-12 rounded bg-white/10" />
        <div className="h-3 w-12 rounded bg-white/10" />
        <div className="h-3 w-12 rounded bg-white/10" />
      </div>
      <div className="h-9 w-9 rounded-full bg-white/10" />
    </div>

    {/* Hero skeleton */}
    <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end px-6 lg:px-12 pb-16 gap-4 max-w-2xl">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="h-10 w-3/4 rounded bg-white/10" />
        <div className="h-10 w-1/2 rounded bg-white/10" />
        <div className="h-4 w-full max-w-md rounded bg-white/10" />
        <div className="flex gap-3 pt-2">
          <div className="h-11 w-32 rounded-full bg-white/10" />
          <div className="h-11 w-28 rounded-full bg-white/10" />
        </div>
      </div>
    </div>

    {/* Row skeletons */}
    <div className="relative z-10 -mt-16 flex flex-col gap-14 pb-20">
      {[0, 1, 2].map((row) => (
        <div key={row} className="px-6 lg:px-12">
          <div className="mb-4 space-y-2">
            <div className="h-5 w-40 rounded bg-white/10" />
            <div className="h-3 w-64 rounded bg-white/10" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((tile) => (
              <div
                key={tile}
                className="h-44 w-72 shrink-0 rounded-xl bg-white/[0.06]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

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

export default function RootRoute() {
  const { user, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [redirectGuest, setRedirectGuest] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Delay skeleton display so fast auth resolution doesn't cause a flash.
  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }
    const id = window.setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [loading, retryKey]);

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
    return (
      <ErrorState
        message={authError}
        onRetry={() => {
          handleRetry();
          // If retry doesn't resolve quickly, the timeout will fire again;
          // meanwhile let users escape to the guest landing.
          setRedirectGuest(false);
        }}
      />
    );
  }

  if (loading) return <Loader />;

  return (
    <Suspense fallback={<Loader />}>
      {user ? <Home /> : <Landing />}
    </Suspense>
  );
}
