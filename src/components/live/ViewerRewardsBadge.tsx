import { motion, AnimatePresence } from 'framer-motion';
import type { ViewerBadge } from '@/hooks/useViewerRewards';

interface ViewerRewardsBadgeProps {
  xp: number;
  badges: ViewerBadge[];
  newBadge: ViewerBadge | null;
  onDismiss: () => void;
}

export default function ViewerRewardsBadge({ xp, badges, newBadge, onDismiss }: ViewerRewardsBadgeProps) {
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <>
      {/* XP counter in corner */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
        >
          <span className="text-[10px] font-mono text-yellow-400 font-bold">⭐ {xp} XP</span>
          {earnedCount > 0 && (
            <span className="text-[10px] text-white/50">· {earnedCount} badges</span>
          )}
        </div>
      </div>

      {/* New badge celebration */}
      <AnimatePresence>
        {newBadge && (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0, scale: 0.9 }}
            className="absolute bottom-16 inset-x-0 z-30 flex justify-center pointer-events-auto"
            onClick={onDismiss}
          >
            <div
              className="px-5 py-3 rounded-xl text-center cursor-pointer"
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 0 30px rgba(234, 179, 8, 0.2)',
              }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-3xl mb-1"
              >
                {newBadge.emoji}
              </motion.div>
              <p className="text-sm font-bold text-white">Badge Earned!</p>
              <p className="text-xs text-yellow-400 font-semibold">{newBadge.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
