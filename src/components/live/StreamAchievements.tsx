import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Achievement } from "@/hooks/useStreamAchievements";

interface StreamAchievementsProps {
  achievements: Achievement[];
  unlockedCount: number;
  totalCount: number;
  progressPercent: number;
  loading: boolean;
}

export default function StreamAchievements({
  achievements,
  unlockedCount,
  totalCount,
  progressPercent,
  loading,
}: StreamAchievementsProps) {
  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="h-2 w-full bg-muted rounded" />
      </div>
    );
  }

  const unlocked = achievements.filter((a) => a.unlockedAt);
  const locked = achievements.filter((a) => !a.unlockedAt);

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            <span className="text-sm font-bold text-foreground">Achievements</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {unlockedCount}/{totalCount} unlocked
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground px-1">🏆 Unlocked</p>
          <div className="grid grid-cols-2 gap-2">
            {unlocked.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-3 text-center border border-primary/20"
              >
                <span className="text-2xl mb-1 block">{a.icon}</span>
                <p className="text-xs font-bold text-foreground">{a.title}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{a.description}</p>
                <Button variant="ghost" size="sm" className="mt-2 h-6 text-[10px] px-2">
                  <Share2 className="w-3 h-3 mr-1" /> Share
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">🔒 Locked</p>
          <div className="grid grid-cols-2 gap-2">
            {locked.map((a) => (
              <div key={a.id} className="glass-card p-3 text-center opacity-60">
                <div className="relative inline-block">
                  <span className="text-2xl mb-1 block grayscale">{a.icon}</span>
                  <Lock className="w-3 h-3 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
                </div>
                <p className="text-xs font-medium text-foreground">{a.title}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{a.description}</p>
                <div className="mt-1.5">
                  <Progress
                    value={(a.progress / a.threshold) * 100}
                    className="h-1"
                  />
                  <p className="text-[8px] text-muted-foreground mt-0.5">
                    {a.progress}/{a.threshold}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AchievementUnlockToast({ achievement }: { achievement: Achievement }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] glass-card p-4 flex items-center gap-3 border border-warning/30 shadow-lg"
      >
        <span className="text-3xl">{achievement.icon}</span>
        <div>
          <p className="text-xs text-warning font-bold">Achievement Unlocked!</p>
          <p className="text-sm font-bold text-foreground">{achievement.title}</p>
          <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
