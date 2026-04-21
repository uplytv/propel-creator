import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  count?: number;
  className?: string;
  size?: "sm" | "md";
}

export default function LiveBadge({ count, className, size = "sm" }: Props) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-destructive text-destructive-foreground font-bold uppercase tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      <Radio className="w-3 h-3" />
      LIVE
      {typeof count === "number" && count > 0 && (
        <span className="ml-0.5 font-semibold tabular-nums">
          {count.toLocaleString()}
        </span>
      )}
    </div>
  );
}
