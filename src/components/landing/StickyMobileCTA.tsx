import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function StickyMobileCTA() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero (300px)
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (dismissed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      >
        <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/[0.08] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50 truncate">Limited spots remaining</p>
            <p className="text-sm font-bold text-white truncate">Apply before the waitlist closes</p>
          </div>
          <Button
            size="sm"
            className="bg-[#00FF85] text-[#0A0A0A] font-bold hover:bg-[#00FF85]/90 border-0 shrink-0 gap-1 active:scale-[0.96]"
            onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
          >
            Apply <ArrowRight className="w-3 h-3" />
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/30 hover:text-white/60 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
