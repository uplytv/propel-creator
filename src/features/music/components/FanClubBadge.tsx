import { Award } from "lucide-react";
import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  founding: "bg-primary/15 text-primary border-primary/40",
  loyal: "bg-purple-500/15 text-purple-300 border-purple-500/40",
  superfan: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  early: "bg-blue-500/15 text-blue-300 border-blue-500/40",
};

export function FanClubBadge({ type, milestone }: { type: string; milestone?: string | null }) {
  return (
    <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs", colors[type] ?? "bg-muted text-muted-foreground border-border")}>
      <Award className="w-3 h-3" />
      <span className="capitalize">{type.replace(/_/g, " ")}</span>
      {milestone && <span className="opacity-70">· {milestone}</span>}
    </div>
  );
}
