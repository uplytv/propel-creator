import { useMemo } from "react";
import { Eye, MousePointerClick, CheckCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type SendRow = { step_id: string; status: string; opened_at: string | null; clicked_at: string | null };
type EnrollRow = { status: string; current_step: number };

interface Props {
  sequenceId: string;
  steps: any[];
}

export default function DripAnalytics({ sequenceId, steps }: Props) {
  const { data: sends = [], isLoading } = useQuery<SendRow[]>({
    queryKey: ["drip-sends-analytics", sequenceId],
    queryFn: async () => {
      const res: any = await supabase
        .from("drip_sequence_sends")
        .select("step_id, status, opened_at, clicked_at")
        .eq("sequence_id", sequenceId);
      return (res.data || []) as SendRow[];
    },
    enabled: !!sequenceId,
  });

  const { data: enrollments = [] } = useQuery<EnrollRow[]>({
    queryKey: ["drip-enrollments-analytics", sequenceId],
    queryFn: async () => {
      const res: any = await supabase
        .from("drip_sequence_enrollments")
        .select("status, current_step")
        .eq("sequence_id", sequenceId);
      return (res.data || []) as EnrollRow[];
    },
    enabled: !!sequenceId,
  });

  const stepStats = useMemo(() => {
    return steps.map(step => {
      const stepSends = sends.filter(s => s.step_id === step.id);
      const total = stepSends.length;
      const sent = stepSends.filter(s => s.status === "sent").length;
      const opened = stepSends.filter(s => s.opened_at).length;
      const clicked = stepSends.filter(s => s.clicked_at).length;
      const openRate = total > 0 ? (opened / total * 100) : 0;
      const clickRate = opened > 0 ? (clicked / opened * 100) : 0;
      return { step, total, sent, opened, clicked, openRate, clickRate };
    });
  }, [steps, sends]);

  const overallStats = useMemo(() => {
    const active = enrollments.filter(e => e.status === "active").length;
    const completed = enrollments.filter(e => e.status === "completed").length;
    const totalEnrolled = enrollments.length;
    const completionRate = totalEnrolled > 0 ? (completed / totalEnrolled * 100) : 0;
    return { active, completed, totalEnrolled, completionRate };
  }, [enrollments]);

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (steps.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" /> Sequence Analytics
      </h4>

      {/* Overall stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 rounded-lg border border-border bg-card text-center">
          <div className="text-lg font-bold text-foreground">{overallStats.totalEnrolled}</div>
          <div className="text-[9px] text-muted-foreground">Enrolled</div>
        </div>
        <div className="p-2 rounded-lg border border-border bg-card text-center">
          <div className="text-lg font-bold text-blue-400">{overallStats.active}</div>
          <div className="text-[9px] text-muted-foreground">Active</div>
        </div>
        <div className="p-2 rounded-lg border border-border bg-card text-center">
          <div className="text-lg font-bold" style={{ color: "#3D7CFF" }}>{overallStats.completed}</div>
          <div className="text-[9px] text-muted-foreground">Done</div>
        </div>
        <div className="p-2 rounded-lg border border-border bg-card text-center">
          <div className="text-lg font-bold text-foreground">{overallStats.completionRate.toFixed(0)}%</div>
          <div className="text-[9px] text-muted-foreground">Completion</div>
        </div>
      </div>

      {/* Funnel per step */}
      <div className="space-y-2">
        {stepStats.map((ss, i) => {
          const maxWidth = stepStats[0]?.total || 1;
          const barWidth = ss.total > 0 ? Math.max(5, (ss.total / maxWidth) * 100) : 5;

          return (
            <div key={ss.step.id} className="p-3 rounded-xl border border-border bg-card/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
                  <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{ss.step.subject || "Untitled"}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{ss.total} sent</span>
              </div>

              {/* Funnel bar */}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${barWidth}%`, background: "linear-gradient(90deg, #3D7CFF, #3b82f6)" }} />
              </div>

              <div className="flex gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3 text-blue-400" /> {ss.openRate.toFixed(1)}% opens
                </span>
                <span className="flex items-center gap-0.5">
                  <MousePointerClick className="w-3 h-3" style={{ color: "#3D7CFF" }} /> {ss.clickRate.toFixed(1)}% clicks
                </span>
                <span className="flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3 text-muted-foreground" /> {ss.opened}/{ss.total}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
