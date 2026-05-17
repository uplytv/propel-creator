import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Compass, ArrowLeft, User } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Sentry } from "@/lib/sentry";
import { useAuth } from "@/context/AuthContext";
import { usePublicProfileInfo } from "@/hooks/usePublicProfilePath";
import { safeNavPath } from "@/lib/routeRegistry";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { path: profilePath, handle: profileHandle } = usePublicProfileInfo();

  useEffect(() => {
    Sentry.captureException(location.pathname, { tags: { context: "not_found" } });
  }, [location.pathname]);

  const primaryPath = user ? "/dashboard" : "/";
  const primaryLabel = user ? "Back to Dashboard" : "Back to Home";

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6 py-12 mobile-safe-content"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <SEOHead
        title="Page Not Found · UPLY"
        description="The page you're looking for doesn't exist on UPLY."
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center"
      >
        {/* Brand mark */}
        <div className="flex items-center justify-center mb-8">
          <img
            src="/logo.png"
            alt="UPLY"
            className="h-10 w-auto object-contain opacity-90"
          />
        </div>

        {/* Glowing 404 */}
        <div className="relative mb-6">
          <div
            className="absolute inset-0 blur-3xl opacity-30"
            style={{ backgroundColor: "#00FF85" }}
          />
          <h1
            className="relative text-7xl sm:text-8xl font-extrabold tracking-tight"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#00FF85",
              textShadow: "0 0 40px rgba(0, 255, 133, 0.4)",
            }}
          >
            404
          </h1>
        </div>

        <h2
          className="text-2xl font-bold mb-2 text-white"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          This page wandered off.
        </h2>
        <p
          className="text-sm leading-relaxed mb-8"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          We couldn't find{" "}
          <span className="font-mono text-white/80 break-all">
            {location.pathname}
          </span>
          . It may have moved, or the link is broken.
        </p>

        {/* Primary CTA — dashboard */}
        <button
          onClick={() => navigate(safeNavPath(primaryPath))}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold transition-transform active:scale-[0.98]"
          style={{
            minHeight: 48,
            backgroundColor: "#00FF85",
            color: "#0A0A0A",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: "0 8px 24px rgba(0, 255, 133, 0.25)",
          }}
        >
          <Home className="w-4 h-4" />
          {primaryLabel}
        </button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 rounded-xl font-medium transition-colors"
            style={{
              minHeight: 44,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.85)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 14,
            }}
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
          <button
            onClick={() => navigate(safeNavPath("/discover"))}
            className="flex items-center justify-center gap-2 rounded-xl font-medium transition-colors"
            style={{
              minHeight: 44,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.85)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 14,
            }}
          >
            <Compass className="w-4 h-4" /> Discover
          </button>
        </div>

        {/* Profile link — only when we have a real handle to land on */}
        {user && profileHandle && (
          <button
            onClick={() => navigate(safeNavPath(profilePath))}
            className="mt-3 inline-flex items-center justify-center gap-2 text-xs"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <User className="w-3.5 h-3.5" />
            View your profile <span className="text-white/70">@{profileHandle}</span>
          </button>
        )}
      </motion.div>
    </div>
  );
}
