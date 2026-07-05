import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { resolveCreatorDestination } from "@/lib/resolveCreatorDestination";

/**
 * Never-404 fallback for creator handles that resolve to no DB profile
 * (deep links / shared URLs like /@omid or /bazi). Runs the standard
 * resolution chain — community/classroom → UPLY profile → curated artist
 * site → artist blog → /roster — and redirects to the first tier that
 * exists, showing a quiet loading shell (never "Not found" copy) while
 * resolving.
 */
export default function CreatorDestinationRedirect({ handle }: { handle: string }) {
  const location = useLocation();
  const [dest, setDest] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveCreatorDestination(handle).then((d) => {
      if (!cancelled) setDest(d);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (!dest) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  // Safety net: never redirect to the path we are already on (no loops).
  const target = dest === location.pathname ? "/roster" : dest;
  return <Navigate to={target} replace />;
}
