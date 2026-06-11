import { AnimatePresence, motion } from "framer-motion";
import type { CameraMode } from "@/lib/cameraModes";
import { MODE_EMOJI } from "@/lib/cameraModes";

interface Props {
  mode: CameraMode | null;
}

/** Top-center pill that briefly announces the new active mode. */
export default function ModeChangeToast({ mode }: Props) {
  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed left-1/2 z-[80] -translate-x-1/2"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 60px)",
          }}
        >
          <div
            className="rounded-full px-4 py-1.5"
            style={{
              background: "rgba(10,10,10,0.8)",
              border: "1px solid #3D7CFF",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "0.05em",
            }}
          >
            {MODE_EMOJI[mode]} {mode}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
