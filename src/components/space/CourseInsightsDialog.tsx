import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BarChart3, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

/** One row of the course_insights(p_creator_id) RPC — per-lesson aggregates,
 *  counts only (no member PII). Owner-guarded server-side. */
export interface CourseInsightRow {
  module_id: string;
  module_title: string;
  module_position: number;
  lesson_id: string;
  lesson_title: string;
  lesson_position: number;
  member_count: number;
  completions: number;
  in_progress: number;
  has_quiz: boolean;
  quiz_takers: number;
  avg_quiz_best_pct: number | null;
}

interface Props {
  creatorId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Owner-only "Course insights" — per-lesson completions, % of members,
 * started-but-unfinished, and average best quiz score, grouped by module.
 * Data comes from ONE SECURITY DEFINER RPC (course_insights) that hard-guards
 * auth.uid() = creator_id and returns aggregate counts only.
 */
export default function CourseInsightsDialog({ creatorId, open, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["course-insights", creatorId],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      // course_insights is not in the generated types yet (regenerate after deploy).
      const { data, error } = await (supabase as any).rpc("course_insights", {
        p_creator_id: creatorId,
      });
      if (error) throw error;
      return (data || []) as CourseInsightRow[];
    },
  });

  const memberCount = data?.[0]?.member_count ?? 0;

  // Group rows by module, preserving the RPC's module/lesson ordering.
  const grouped = useMemo(() => {
    const out: { moduleId: string; moduleTitle: string; lessons: CourseInsightRow[] }[] = [];
    for (const row of data || []) {
      const last = out[out.length - 1];
      if (last && last.moduleId === row.module_id) last.lessons.push(row);
      else out.push({ moduleId: row.module_id, moduleTitle: row.module_title, lessons: [row] });
    }
    return out;
  }, [data]);

  const pctOfMembers = (n: number) =>
    memberCount > 0 ? `${Math.round((n / memberCount) * 100)}%` : "—";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Course insights
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {isLoading
              ? "Loading engagement data…"
              : `${memberCount.toLocaleString()} member${memberCount === 1 ? "" : "s"} — per-lesson completions, in-progress starts, and quiz scores.`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-full rounded-sm" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2.5 rounded-sm border border-border bg-muted/30 p-4">
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
            <p className="text-sm text-muted-foreground">Couldn't load course insights. Try again in a moment.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-sm border border-border bg-muted/30 p-6 text-center">
            <p className="text-sm font-medium text-foreground">No lessons yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Insights appear here once your course has lessons and members start watching.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Lesson</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Completed</TableHead>
                  <TableHead className="text-right whitespace-nowrap">% of members</TableHead>
                  <TableHead className="text-right whitespace-nowrap">In progress</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Avg quiz best</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((mod) => (
                  [
                    <TableRow key={mod.moduleId} className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={5} className="py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {mod.moduleTitle}
                      </TableCell>
                    </TableRow>,
                    ...mod.lessons.map((l) => (
                      <TableRow key={l.lesson_id}>
                        <TableCell className="font-medium text-foreground">{l.lesson_title}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.completions.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{pctOfMembers(l.completions)}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.in_progress.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {l.has_quiz
                            ? l.quiz_takers > 0 && l.avg_quiz_best_pct != null
                              ? `${Number(l.avg_quiz_best_pct)}%`
                              : "No attempts"
                            : "—"}
                        </TableCell>
                      </TableRow>
                    )),
                  ]
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
