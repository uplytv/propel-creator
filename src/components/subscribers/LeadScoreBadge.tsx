import { Flame } from "lucide-react";

interface Props {
  score: number;
  className?: string;
}

export default function LeadScoreBadge({ score, className = "" }: Props) {
  const color = score >= 70 ? "#3D7CFF" : score >= 40 ? "#f59e0b" : score >= 10 ? "#3b82f6" : "#666";
  const label = score >= 70 ? "Hot" : score >= 40 ? "Warm" : score >= 10 ? "Cool" : "New";
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Flame className="w-3 h-3" style={{ color }} />
      <span className="text-[10px] font-medium" style={{ color }}>{score}</span>
      <span className="text-[9px] text-muted-foreground">({label})</span>
    </div>
  );
}
