import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { isIOS, isNative } from "@/lib/native/platform";
const DISMISSED_KEY = "uply_founders_cta_dismissed";

/**
 * Sticky bottom CTA shown on landing pages for logged-out (or non-founder) visitors.
 * Promotes Founders Access with a live seats-remaining counter.
 */
export default function FoundersStickyCTA() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISSED_KEY) === "1");
    (supabase.rpc as any)("get_founders_stats").then(({ data }: any) => {
      if (data) {
        const left = Math.max(0, Number(data.cap || 100) - Number(data.claimed || 0));
        setSeatsLeft(left);
      }
    });
  }, []);

  useEffect(() => {
    // Delay reveal so it doesn't fight the splash/hero
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // App Store policy: hide paid-access promo inside iOS native shell.
  if (isNative() && isIOS()) return null;
  // Only show on landing-style public pages
  const allowedPaths = ["/", "/index", "/pricing"];
  if (!allowedPaths.includes(pathname)) return null;
  if (user) return null; // logged-in users get the in-app waitlist card
  if (dismissed) return null;
  if (seatsLeft === 0) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 240 }}
          className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pointer-events-none"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 0.75rem)" }}
        >
          <div className="max-w-3xl mx-auto pointer-events-auto rounded-xl border border-primary/40 bg-background/95 backdrop-blur-md shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.35)] flex items-center gap-2 p-3 sm:p-3.5">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-primary font-bold">
                {seatsLeft !== null ? `${seatsLeft} founder seats left` : "Founders Access"}
              </div>
              <div className="text-sm font-semibold truncate">
                Skip the waitlist · build before public launch
              </div>
            </div>
            <Link
              to="/founders"
              className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors min-h-[40px] flex items-center"
            >
              Claim
            </Link>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="shrink-0 w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
