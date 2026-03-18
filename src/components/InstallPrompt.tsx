import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const { showPrompt, install, dismiss } = useInstallPrompt();

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-4 right-4 z-[60] md:left-auto md:right-6 md:w-80"
        >
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-accent-green" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Add Uply to your home screen</p>
                <p className="text-xs text-muted-foreground mt-0.5">for the full experience</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={install}
                className="flex-1 py-2 rounded-lg bg-accent-green text-accent-green-foreground text-sm font-semibold"
              >
                Add Now
              </button>
              <button
                onClick={dismiss}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
