import { motion } from "framer-motion";
import { Sparkles, Compass } from "lucide-react";

export type DashboardMode = "ai" | "discover";

interface Props {
  mode: DashboardMode;
  onChange: (mode: DashboardMode) => void;
}

export default function DashboardModeToggle({ mode, onChange }: Props) {
  return (
    <div className="relative flex items-center bg-secondary/80 rounded-full p-1 w-fit">
      {/* Sliding background pill */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-full bg-primary"
        initial={false}
        animate={{
          left: mode === "ai" ? "4px" : "50%",
          right: mode === "discover" ? "4px" : "50%",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />

      <button
        onClick={() => onChange("ai")}
        className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
          mode === "ai" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI
      </button>

      <button
        onClick={() => onChange("discover")}
        className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
          mode === "discover" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Compass className="w-3.5 h-3.5" />
        Discover
      </button>
    </div>
  );
}
