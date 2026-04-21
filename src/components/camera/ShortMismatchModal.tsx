import { motion } from "framer-motion";

interface Props {
  open: boolean;
  onPostAsVideo: () => void;
  onTrim: () => void;
  onCancel: () => void;
}

/**
 * Shown when a user picks a horizontal or >60s clip while SHORT mode is
 * active. Offers to switch to VIDEO mode, trim down, or cancel.
 */
export default function ShortMismatchModal({ open, onPostAsVideo, onTrim, onCancel }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-3xl bg-card p-6 sm:rounded-3xl"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
        }}
      >
        <h3 className="mb-2 text-lg font-bold text-foreground">Doesn't fit SHORT format</h3>
        <p className="mb-5 text-sm text-muted-foreground">
          SHORT requires a vertical clip ≤ 60 seconds. How would you like to continue?
        </p>
        <div className="space-y-2">
          <button
            onClick={onPostAsVideo}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Post as Video
          </button>
          <button
            onClick={onTrim}
            className="w-full rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground"
          >
            Trim to Short
          </button>
          <button
            onClick={onCancel}
            className="w-full rounded-xl py-3 text-sm font-medium text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
