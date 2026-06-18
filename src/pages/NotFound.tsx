import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Compass, ArrowLeft, User } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Sentry } from "@/lib/sentry";
import { useAuth } from "@/context/AuthContext";
import { usePublicProfileInfo } from "@/hooks/usePublicProfilePath";
import { safeNavPath } from "@/lib/routeRegistry";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 mobile-safe-content">
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
          <img src="/logo.png" alt="UPLY" className="h-10 w-auto object-contain opacity-90" />
        </div>

        {/* Glowing 404 — brand gradient */}
        <div className="relative mb-6">
          <div className="absolute inset-0 blur-3xl opacity-25 bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)]" />
          <h1
            className="relative text-7xl sm:text-8xl font-extrabold tracking-tight bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] bg-clip-text text-transparent"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            404
          </h1>
        </div>

        <h2 className="text-2xl font-bold mb-2 text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          This page wandered off.
        </h2>
        <p className="text-sm leading-relaxed mb-8 text-muted-foreground">
          We couldn't find{" "}
          <span className="font-mono text-foreground/80 break-all">{location.pathname}</span>. It may have moved, or the link is broken.
        </p>

        {/* Primary CTA */}
        <Button onClick={() => navigate(safeNavPath(primaryPath))} className="w-full gap-2 h-12">
          <Home className="w-4 h-4" /> {primaryLabel}
        </Button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 h-11">
            <ArrowLeft className="w-4 h-4" /> Go back
          </Button>
          <Button variant="outline" onClick={() => navigate(safeNavPath("/discover"))} className="gap-2 h-11">
            <Compass className="w-4 h-4" /> Discover
          </Button>
        </div>

        {/* Profile link — only when we have a real handle to land on */}
        {user && profileHandle && (
          <button
            onClick={() => navigate(safeNavPath(profilePath))}
            className="mt-3 inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            View your profile <span className="text-foreground/70">@{profileHandle}</span>
          </button>
        )}
      </motion.div>
    </div>
  );
}
