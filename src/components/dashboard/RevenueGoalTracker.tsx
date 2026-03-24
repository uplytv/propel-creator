import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Pencil, Check, X } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const PRESETS = [500, 1000, 2500, 5000, 10000];

export function RevenueGoalTracker() {
  const { data: stats } = useDashboardStats();
  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem("revenue_goal");
    return saved ? Number(saved) : 1000;
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal));

  const current = stats?.revenueThisMonth ?? 0;
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const save = () => {
    const val = Math.max(1, Number(draft) || 1000);
    setGoal(val);
    localStorage.setItem("revenue_goal", String(val));
    setEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-4"
    >
      {/* Progress Ring */}
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
          <motion.circle
            cx="44" cy="44" r={radius} fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Target className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Monthly Revenue Goal</span>
        </div>

        {editing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">$</span>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm font-medium text-foreground"
            />
            <button onClick={save} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="p-1 rounded bg-secondary text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-lg font-bold text-foreground leading-tight">
              ${current.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ ${goal.toLocaleString()}</span>
            </p>
            <button
              onClick={() => { setDraft(String(goal)); setEditing(true); }}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5"
            >
              <Pencil className="w-2.5 h-2.5" /> Edit goal
            </button>
          </>
        )}

        {/* Quick presets when editing */}
        {editing && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setDraft(String(p))}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  Number(draft) === p
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                ${p.toLocaleString()}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
