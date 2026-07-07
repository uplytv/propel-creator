import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  creatorUserId: string;
}

interface PlanRow {
  id: string;
  attend_date: string;
  status: string;
  event_title?: string | null;
  event_id?: string | null;
}

/**
 * "This Week" strip on a creator profile.
 * Surfaces the creator's public going-out plans (attendance table) for the next 7 days.
 * Source: same data the user manages in MyPlansCard / GoingOutWeekCard.
 * Plans/Radiate kept separate (Section 5 — option a). This is read-only on profiles.
 */
export default function WeeklyPlansStrip({ creatorUserId }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const horizon = new Date(Date.now() + 7 * 86400_000).toISOString().split("T")[0];

  const { data: plans = [] } = useQuery<PlanRow[]>({
    queryKey: ["creator-weekly-plans", creatorUserId, today],
    enabled: !!creatorUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id,attend_date,status,event_title,event_id")
        .eq("user_id", creatorUserId)
        .in("status", ["going", "maybe"])
        .eq("visibility", "public")
        .gte("attend_date", today)
        .lte("attend_date", horizon)
        .order("attend_date", { ascending: true });
      return (data || []) as PlanRow[];
    },
    staleTime: 60_000,
  });

  if (!plans.length) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-6 py-6">
      <h2 className="font-heading text-base font-semibold mb-3 text-foreground inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" /> This week
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 snap-x">
        {plans.map((p) => (
          <div
            key={p.id}
            className="snap-start shrink-0 min-w-[180px] rounded-lg border border-border/40 bg-card/40 p-3"
          >
            <p className="text-xs text-primary font-medium uppercase tracking-wide">
              {format(new Date(p.attend_date), "EEE, MMM d")}
            </p>
            <p className="mt-1 text-sm text-foreground line-clamp-2">
              {p.event_title || (p.status === "maybe" ? "Maybe out" : "Going out")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
