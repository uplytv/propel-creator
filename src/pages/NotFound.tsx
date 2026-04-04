import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { Sentry } from "@/lib/sentry";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    Sentry.captureException(location.pathname, { tags: { context: "not_found" } });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <SEOHead title="Page Not Found" description="The page you're looking for doesn't exist on Uply." />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md text-center space-y-5"
      >
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
            <MapPin className="w-9 h-9 text-primary" />
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-extrabold mb-2">404</h1>
          <p className="text-lg font-semibold text-foreground mb-1">Page not found</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button onClick={() => navigate(-1)} variant="outline" className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
          <Button onClick={() => navigate("/dashboard")} className="gap-2 w-full sm:w-auto">
            <Home className="w-4 h-4" /> Dashboard
          </Button>
          <Button onClick={() => navigate("/discover")} variant="secondary" className="gap-2 w-full sm:w-auto">
            <Search className="w-4 h-4" /> Discover
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
