import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield } from "lucide-react";

interface OriginBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export default function OriginBadge({ size = "sm", className = "" }: OriginBadgeProps) {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";
  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold ${textSize} ${className}`}
          style={{
            background: "linear-gradient(135deg, hsl(220, 80%, 55%), hsl(280, 70%, 55%))",
            color: "white",
          }}
        >
          <Shield className={iconSize} />
          Origin
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">UPLY Origin — Founding Class Member</p>
      </TooltipContent>
    </Tooltip>
  );
}
