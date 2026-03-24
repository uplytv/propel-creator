import { motion, AnimatePresence } from 'framer-motion';

interface RaidOverlayProps {
  isRaiding: boolean;
  raidCountdown: number | null;
  targetName?: string;
  incomingRaid: { from: string; viewerCount: number } | null;
}

export default function RaidOverlay({ isRaiding, raidCountdown, targetName, incomingRaid }: RaidOverlayProps) {
  return (
    <>
      {/* Outgoing raid countdown */}
      <AnimatePresence>
        {isRaiding && raidCountdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <motion.div
                key={raidCountdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-6xl font-bold text-white mb-4"
                style={{ textShadow: '0 0 30px rgba(239,68,68,0.5)' }}
              >
                {raidCountdown}
              </motion.div>
              <p className="text-lg font-bold text-white">
                🚀 Raiding <span className="text-red-400">{targetName}</span>
              </p>
              <p className="text-sm text-white/60 mt-1">
                Sending viewers in {raidCountdown}s...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming raid banner */}
      <AnimatePresence>
        {incomingRaid && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-20 inset-x-0 z-30 pointer-events-none flex justify-center"
          >
            <div
              className="px-6 py-3 rounded-2xl text-center"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)',
              }}
            >
              <p className="text-lg font-bold text-white">
                🚀 RAID INCOMING!
              </p>
              <p className="text-sm text-white/70 mt-0.5">
                <span className="font-semibold text-red-400">{incomingRaid.from}</span> is raiding with {incomingRaid.viewerCount} viewers!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
