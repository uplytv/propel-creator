import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Sparkles, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterGroup = "all" | "kpi" | "onboarding";

interface Milestone {
  id: string;
  milestone_key: string;
  label: string;
  emoji: string;
  group_type: string;
  reached_at: string;
}

export default function Achievements() {
  const { user } = useAuth();
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_milestones")
        .select("*")
        .eq("user_id", user.id)
        .order("reached_at", { ascending: false });
      setItems((data as Milestone[]) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterGroup>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.group_type !== filter) return false;
      if (!q) return true;
      return (
        i.label.toLowerCase().includes(q) ||
        i.milestone_key.toLowerCase().includes(q) ||
        (i.emoji || "").includes(q)
      );
    });
  }, [items, query, filter]);

  const groups = {
    onboarding: filtered.filter((i) => i.group_type === "onboarding"),
    kpi: filtered.filter((i) => i.group_type === "kpi"),
  };

  const counts = {
    all: items.length,
    kpi: items.filter((i) => i.group_type === "kpi").length,
    onboarding: items.filter((i) => i.group_type === "onboarding").length,
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 mobile-safe-content">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Achievements</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          A history of milestones you've unlocked on your journey.
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No milestones yet</h3>
            <p className="text-sm text-muted-foreground">
              Keep building — your first milestone is coming.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {(["kpi", "onboarding"] as const).map((g) => {
              const list = groups[g];
              if (list.length === 0) return null;
              return (
                <section key={g}>
                  <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    {g === "kpi" ? "Growth Plan" : "Onboarding"}
                    <span className="ml-2 text-foreground/60">({list.length})</span>
                  </h2>
                  <ul className="space-y-2">
                    {list.map((m, i) => (
                      <motion.li
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
                      >
                        <div className="text-3xl">{m.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{m.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Unlocked {format(new Date(m.reached_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <Trophy className="w-4 h-4 text-primary shrink-0" />
                      </motion.li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
