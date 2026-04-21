import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

/**
 * /auth-retry — dedicated, lightweight retry surface for failed auth loads.
 *
 * Mounted independently from RootRoute so retrying does NOT trigger a
 * RootRoute remount (which would re-run skeleton timing, prefetch logic,
 * and adaptive-delay reads). Instead we re-run getSession() in isolation
 * and forward the user to the appropriate destination.
 */
const RETRY_TIMEOUT_MS = 8000;

export default function AuthRetry() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "authed" | "guest">(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setDone(null);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setError(
        "Still couldn't reach authentication. Please check your connection."
      );
    }, RETRY_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message || "Authentication failed.");
          return;
        }
        setDone(data.session?.user ? "authed" : "guest");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Network error during retry.";
        setError(msg);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [attempt]);

  if (done === "authed") return <Navigate to="/" replace />;
  if (done === "guest") return <Navigate to="/welcome" replace />;

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0A0A0A] px-6 text-center text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-2xl">
          ⚠️
        </div>
        <div className="space-y-2 max-w-sm">
          <h1 className="text-xl font-semibold">Retry failed</h1>
          <p className="text-sm text-white/60">{error}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="rounded-full bg-[#00FF85] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#00FF85]/90 transition"
          >
            Try again
          </button>
          <button
            onClick={() => navigate("/welcome", { replace: true })}
            className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition"
          >
            Continue as guest
          </button>
        </div>
      </div>
    );
  }

  return <PageSkeleton />;
}
