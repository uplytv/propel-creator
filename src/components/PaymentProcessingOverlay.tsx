import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";

/** Shown while we poll for the webhook to confirm a checkout (join/enroll/
 *  access). Gives the buyer clear "we've got your payment, activating now"
 *  feedback instead of a silent wait. Driven by usePaymentReturn().checking. */
export default function PaymentProcessingOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 backdrop-blur-md px-6"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl"
          >
            <div className="relative mx-auto mb-4 h-14 w-14">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)] opacity-20 blur-md" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[hsl(220_100%_62%)] to-[hsl(280_85%_60%)]">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-foreground">Payment received 🎉</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Activating your access — this usually takes a few seconds.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" /> Setting things up…
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
