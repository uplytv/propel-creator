import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, LayoutGrid, Radio, GraduationCap, Package, Users, ChevronRight, Sparkles, X, Copy, Link } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChecklistStep {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  action: () => void;
  checkFn: () => Promise<boolean>;
}

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);

  const steps: ChecklistStep[] = [
    {
      id: "space",
      label: "Create your space",
      desc: "Set up your community hub",
      icon: LayoutGrid,
      action: () => navigate(user ? `/space/${user.id}` : "/auth"),
      checkFn: async () => {
        if (!user) return false;
        const { count } = await supabase
          .from("creator_spaces")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id);
        return (count ?? 0) > 0;
      },
    },
    {
      id: "product",
      label: "Add your first product",
      desc: "Create something to sell",
      icon: Package,
      action: () => navigate("/products"),
      checkFn: async () => {
        if (!user) return false;
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        return (count ?? 0) > 0;
      },
    },
    {
      id: "lesson",
      label: "Upload a lesson",
      desc: "Start building your course",
      icon: GraduationCap,
      action: () => navigate(user ? `/space/${user.id}?tab=classroom` : "/auth"),
      checkFn: async () => {
        if (!user) return false;
        const { count } = await supabase
          .from("classroom_modules")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id);
        return (count ?? 0) > 0;
      },
    },
    {
      id: "live",
      label: "Go live",
      desc: "Stream to your audience",
      icon: Radio,
      action: () => navigate("/go-live"),
      checkFn: async () => {
        if (!user) return false;
        const { count } = await supabase
          .from("mux_live_streams")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        return (count ?? 0) > 0;
      },
    },
    {
      id: "member",
      label: "Invite your first member",
      desc: "Share your community link",
      icon: Users,
      action: () => {
        if (user) {
          setShowInviteLink(prev => !prev);
        } else {
          navigate("/auth");
        }
      },
      checkFn: async () => {
        if (!user) return false;
        const { count } = await supabase
          .from("community_members")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id);
        return (count ?? 0) > 0;
      },
    },
  ];

  useEffect(() => {
    if (!user) return;
    const checkAll = async () => {
      const results = await Promise.all(
        steps.map(async (step) => {
          const done = await step.checkFn();
          return done ? step.id : null;
        })
      );
      setCompletedSteps(results.filter(Boolean) as string[]);
      setLoading(false);
    };
    checkAll();

    // Check dismissed state
    const d = localStorage.getItem(`checklist-dismissed-${user.id}`);
    if (d) setDismissed(true);
  }, [user]);

  const progress = steps.length > 0 ? (completedSteps.length / steps.length) * 100 : 0;
  const allDone = completedSteps.length === steps.length;

  if (dismissed || loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5 mb-8 relative"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {allDone ? "You're all set! 🎉" : "Get started with UPLY"}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {allDone
              ? "You've completed all setup steps. You're ready to grow!"
              : `${completedSteps.length} of ${steps.length} steps complete`}
          </p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            if (user) localStorage.setItem(`checklist-dismissed-${user.id}`, "1");
          }}
          className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-4">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1">
        {steps.map((step) => {
          const done = completedSteps.includes(step.id);
          return (
            <button
              key={step.id}
              onClick={step.action}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                done
                  ? "opacity-60"
                  : "hover:bg-secondary/60"
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                done
                  ? "bg-primary/20"
                  : "bg-secondary group-hover:bg-primary/10"
              }`}>
                {done ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <step.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{step.desc}</p>
              </div>
              {!done && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
              )}
            </button>
          );
        })}
      </div>

      {/* Invite link popout */}
      <AnimatePresence>
        {showInviteLink && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 rounded-lg bg-secondary/60 border border-border">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <Link className="w-3 h-3" />
                Your community invite link
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/space/${user.id}`}
                  className="flex-1 text-xs bg-background border border-border rounded-md px-3 py-2 text-foreground select-all truncate"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`${window.location.origin}/space/${user.id}`);
                    toast.success("Link copied to clipboard!");
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
