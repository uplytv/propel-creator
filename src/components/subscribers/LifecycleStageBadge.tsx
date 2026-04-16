import { Badge } from "@/components/ui/badge";

const STAGES: Record<string, { label: string; color: string; emoji: string }> = {
  new: { label: "New", color: "bg-blue-500/10 text-blue-400", emoji: "🌱" },
  engaged: { label: "Engaged", color: "bg-green-500/10 text-green-400", emoji: "⚡" },
  loyal: { label: "Loyal", color: "bg-yellow-500/10 text-yellow-400", emoji: "⭐" },
  "at-risk": { label: "At Risk", color: "bg-orange-500/10 text-orange-400", emoji: "⚠️" },
  churned: { label: "Churned", color: "bg-red-500/10 text-red-400", emoji: "💤" },
};

export default function LifecycleStageBadge({ stage }: { stage: string }) {
  const cfg = STAGES[stage] || STAGES.new;
  return (
    <Badge variant="outline" className={`${cfg.color} text-[9px] px-1.5 py-0`}>
      {cfg.emoji} {cfg.label}
    </Badge>
  );
}
