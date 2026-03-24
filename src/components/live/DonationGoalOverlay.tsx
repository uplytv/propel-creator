import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Coins, X, Check, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface DonationGoalOverlayProps {
  streamId: string;
  isHost: boolean;
  creatorId?: string;
}

interface GoalState {
  title: string;
  targetAmount: number;
  currentAmount: number;
}

export default function DonationGoalOverlay({ streamId, isHost, creatorId }: DonationGoalOverlayProps) {
  const [goal, setGoal] = useState<GoalState | null>(null);
  const [editing, setEditing] = useState(false);
  const [goalTitle, setGoalTitle] = useState("Stream Goal");
  const [goalTarget, setGoalTarget] = useState("100");
  const [justCompleted, setJustCompleted] = useState(false);

  // Listen for tips in real-time to update progress
  useEffect(() => {
    if (!streamId || !goal) return;

    const channel = supabase
      .channel(`donation-goal-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tip_transactions",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload: any) => {
          const tipAmount = payload.new?.amount || 0;
          setGoal((prev) => {
            if (!prev) return prev;
            const newAmount = prev.currentAmount + tipAmount;
            if (newAmount >= prev.targetAmount && prev.currentAmount < prev.targetAmount) {
              setJustCompleted(true);
              setTimeout(() => setJustCompleted(false), 5000);
            }
            return { ...prev, currentAmount: newAmount };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, goal]);

  // Fetch existing tip total when goal is set
  const fetchExistingTips = useCallback(async () => {
    if (!streamId) return 0;
    const { data } = await supabase
      .from("tip_transactions")
      .select("amount")
      .eq("stream_id", streamId);
    return data?.reduce((sum, t) => sum + t.amount, 0) || 0;
  }, [streamId]);

  const handleSetGoal = async () => {
    const target = parseInt(goalTarget, 10);
    if (!target || target <= 0) return;
    const existingAmount = await fetchExistingTips();
    setGoal({
      title: goalTitle.trim() || "Stream Goal",
      targetAmount: target,
      currentAmount: existingAmount,
    });
    setEditing(false);
  };

  const handleClearGoal = () => {
    setGoal(null);
    setJustCompleted(false);
  };

  const percentage = goal ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;

  // Host: edit button to set/change goal
  if (isHost && !goal && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
        title="Set donation goal"
      >
        <Target className="w-4.5 h-4.5 text-white" />
      </button>
    );
  }

  // Host: editing modal
  if (isHost && editing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="absolute bottom-32 left-3 right-16 z-30"
      >
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white">Set Donation Goal</span>
            </div>
            <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="Goal title (e.g., New mic fund)"
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <input
              type="number"
              min="1"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="Target amount ($)"
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
          </div>
          <Button
            onClick={handleSetGoal}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
            size="sm"
          >
            <Check className="w-4 h-4 mr-1" /> Set Goal
          </Button>
        </div>
      </motion.div>
    );
  }

  // Goal active — thermometer display (visible to host and viewers)
  if (!goal) return null;

  return (
    <>
      {/* Goal completed celebration */}
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                className="text-5xl mb-2"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                🎉
              </motion.div>
              <p className="text-2xl font-black text-amber-400">GOAL REACHED!</p>
              <p className="text-sm text-white/60 mt-1">{goal.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thermometer bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-20 left-3 right-16 z-20 pointer-events-none"
      >
        <div
          className="rounded-xl px-3 py-2.5 pointer-events-auto"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-white truncate max-w-[140px]">{goal.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono font-bold text-amber-400">
                ${goal.currentAmount}
              </span>
              <span className="text-[10px] text-white/40">/ ${goal.targetAmount}</span>
              {isHost && (
                <button onClick={handleClearGoal} className="ml-1 text-white/30 hover:text-white/60">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: percentage >= 100
                  ? "linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)"
                  : "linear-gradient(90deg, #f59e0b, #fbbf24)",
              }}
              animate={{ width: `${percentage}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 15 }}
            />
          </div>
          <p className="text-[9px] text-white/30 text-right mt-0.5">{percentage}% complete</p>
        </div>
      </motion.div>
    </>
  );
}
