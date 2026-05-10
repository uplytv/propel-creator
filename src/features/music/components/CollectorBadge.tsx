import { Award } from "lucide-react";

interface Props {
  editionNumber: number;
  totalEditions: number;
  size?: "sm" | "md" | "lg";
}

export function CollectorBadge({ editionNumber, totalEditions, size = "md" }: Props) {
  const dim = size === "sm" ? "w-12 h-12 text-[10px]" : size === "lg" ? "w-24 h-24 text-base" : "w-16 h-16 text-xs";
  const tier = editionNumber === 1 ? "platinum" : editionNumber <= 10 ? "gold" : editionNumber <= 50 ? "silver" : "bronze";
  const tierColors: Record<string, string> = {
    platinum: "from-cyan-300/40 to-purple-400/40 border-cyan-300/60 text-cyan-100",
    gold: "from-amber-300/40 to-orange-400/40 border-amber-300/60 text-amber-100",
    silver: "from-slate-200/40 to-slate-400/40 border-slate-200/60 text-slate-100",
    bronze: "from-orange-700/40 to-amber-800/40 border-orange-600/60 text-orange-200",
  };

  return (
    <div
      className={`relative ${dim} rounded-full border-2 bg-gradient-to-br ${tierColors[tier]} flex flex-col items-center justify-center font-bold backdrop-blur`}
      aria-label={`Edition ${editionNumber} of ${totalEditions}`}
    >
      <Award className="absolute -top-1 -right-1 w-4 h-4 text-foreground/80" />
      <span className="leading-none">#{editionNumber}</span>
      <span className="opacity-70 leading-none mt-0.5">/{totalEditions}</span>
    </div>
  );
}
