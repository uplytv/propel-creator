import { useMemo } from "react";
import { Star, Zap, Crown, Shield, Flame } from "lucide-react";

const LEVELS = [
  { name: "Newcomer", minXP: 0, icon: Star, color: "text-muted-foreground" },
  { name: "Active", minXP: 25, icon: Zap, color: "text-blue-400" },
  { name: "Contributor", minXP: 100, icon: Flame, color: "text-orange-400" },
  { name: "Champion", minXP: 300, icon: Shield, color: "text-purple-400" },
  { name: "Legend", minXP: 1000, icon: Crown, color: "text-yellow-400" },
];

export function getLevel(xp: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) level = l;
  }
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1];
  const progress = next
    ? ((xp - level.minXP) / (next.minXP - level.minXP)) * 100
    : 100;
  return { ...level, levelNum: idx + 1, progress: Math.min(progress, 100), nextLevel: next };
}

interface Props {
  xp: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function MemberXPBadge({ xp, showLabel = true, size = "sm" }: Props) {
  const level = useMemo(() => getLevel(xp), [xp]);
  const Icon = level.icon;
  const sizeClasses = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";

  return (
    <span className="inline-flex items-center gap-1" title={`${level.name} — ${xp} XP`}>
      <Icon className={`${sizeClasses} ${level.color}`} />
      {showLabel && (
        <span className={`text-[10px] font-semibold ${level.color}`}>
          Lv.{level.levelNum}
        </span>
      )}
    </span>
  );
}
