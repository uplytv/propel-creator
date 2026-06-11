import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

export default function ExitIntentModal() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // Only trigger on desktop
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !dismissed) {
        setShow(true);
      }
    };

    // Delay registration to avoid false triggers on page load
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [dismissed]);

  const handleApply = () => {
    if (email && email.includes("@")) {
      navigate(`/auth?email=${encodeURIComponent(email)}`);
    } else {
      navigate("/auth");
    }
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative max-w-sm w-full rounded-2xl border border-primary/20 bg-background p-8 text-center"
            style={{ boxShadow: "0 0 80px rgba(61, 124, 255,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-white/30 hover:text-white/60"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Flame className="w-7 h-7 text-primary" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Wait — don't miss your spot.
            </h3>
            <p className="text-sm text-white/40 mb-6 leading-relaxed">
              Founders who apply early get priority access, lower fees, and a shot at the $10K referral prize. This window won't stay open.
            </p>

            <div className="space-y-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/25 text-center h-12"
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
              />
              <Button
                className="w-full bg-primary text-foreground font-bold hover:bg-primary/90 border-0 h-12 active:scale-[0.96] transition-transform"
                onClick={handleApply}
              >
                Claim My Spot <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            <p className="text-[10px] text-white/20 mt-4">
              Free to apply · No credit card · Invite only
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
