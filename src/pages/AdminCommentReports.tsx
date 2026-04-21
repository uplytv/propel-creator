import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Flag, EyeOff, Eye, Trash2, Check, ShieldX, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";

type ReportStatus = "pending" | "approved" | "removed" | "dismissed";

interface ReportRow {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  comment?: {
    id: string;
    body: string;
    user_id: string;
    short_id: string;
    source: "clip" | "short";
    is_hidden: boolean;
    created_at: string;
  } | null;
  reporter?: { display_name: string | null; avatar_url: string | null } | null;
  target?: { display_name: string | null; avatar_url: string | null } | null;
}

const REASON_LABEL: Record<string, string> = {
  inappropriate: "Inappropriate",
  spam: "Spam",
  harassment: "Harassment",
  hate: "Hate speech",
  violence: "Violence",
  other: "Other",
};

export default function AdminCommentReports() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<ReportStatus>("pending");
  const [confirmDelete, setConfirmDelete] = useState<{ reportId: string; commentId: string } | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-comment-reports", tab],
    queryFn: async (): Promise<ReportRow[]> => {
      const { data: rs, error } = await (supabase as any)
        .from("comment_reports")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (rs || []) as ReportRow[];
      if (!rows.length) return [];

      const commentIds = [...new Set(rows.map((r) => r.comment_id))];
      const { data: comments } = await (supabase as any)
        .from("short_comments")
        .select("id, body, user_id, short_id, source, is_hidden, created_at")
        .in("id", commentIds);
      const cmap = new Map((comments || []).map((c: any) => [c.id, c]));

      const userIds = [
        ...new Set([
          ...rows.map((r) => r.reporter_id),
          ...((comments || []).map((c: any) => c.user_id) as string[]),
        ]),
      ];
      const { data: profs } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const pmap = new Map((profs as any[] || []).map((p: any) => [p.user_id, p]));

      return rows.map((r) => {
        const c = (cmap.get(r.comment_id) || null) as ReportRow["comment"];
        return {
          ...r,
          comment: c,
          reporter: pmap.get(r.reporter_id) || null,
          target: c ? pmap.get(c.user_id) || null : null,
        };
      });
    },
  });

  const counts = useQuery({
    queryKey: ["admin-comment-reports-counts"],
    queryFn: async () => {
      const statuses: ReportStatus[] = ["pending", "approved", "removed", "dismissed"];
      const result: Record<ReportStatus, number> = { pending: 0, approved: 0, removed: 0, dismissed: 0 };
      await Promise.all(
        statuses.map(async (s) => {
          const { count } = await (supabase as any)
            .from("comment_reports")
            .select("id", { count: "exact", head: true })
            .eq("status", s);
          result[s] = count || 0;
        })
      );
      return result;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReportStatus }) => {
      const { error } = await (supabase as any).from("comment_reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-comment-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-comment-reports-counts"] });
    },
    onError: (e: Error) => toast.error("Update failed", { description: e.message }),
  });

  const hideComment = useMutation({
    mutationFn: async ({ commentId, hide }: { commentId: string; hide: boolean }) => {
      const { error } = await (supabase as any)
        .from("short_comments")
        .update({
          is_hidden: hide,
          hidden_at: hide ? new Date().toISOString() : null,
        })
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-comment-reports"] });
      toast.success(vars.hide ? "Comment hidden" : "Comment shown");
    },
    onError: (e: Error) => toast.error("Action failed", { description: e.message }),
  });

  const deleteComment = useMutation({
    mutationFn: async ({ reportId, commentId }: { reportId: string; commentId: string }) => {
      const { error } = await (supabase as any).from("short_comments").delete().eq("id", commentId);
      if (error) throw error;
      await (supabase as any).from("comment_reports").update({ status: "removed" }).eq("id", reportId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-comment-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-comment-reports-counts"] });
      toast.success("Comment removed");
    },
    onError: (e: Error) => toast.error("Remove failed", { description: e.message }),
  });

  const list = useMemo(() => reports, [reports]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-bold flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" /> Comment Reports
            </h1>
            <p className="text-xs text-muted-foreground">Review and resolve flagged comments</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as ReportStatus)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="pending">
              Pending {counts.data?.pending ? <Badge variant="secondary" className="ml-1.5">{counts.data.pending}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved {counts.data?.approved ? <Badge variant="secondary" className="ml-1.5">{counts.data.approved}</Badge> : null}</TabsTrigger>
            <TabsTrigger value="removed">Removed {counts.data?.removed ? <Badge variant="secondary" className="ml-1.5">{counts.data.removed}</Badge> : null}</TabsTrigger>
            <TabsTrigger value="dismissed">Dismissed {counts.data?.dismissed ? <Badge variant="secondary" className="ml-1.5">{counts.data.dismissed}</Badge> : null}</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-lg">
                <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No {tab} reports</p>
              </div>
            ) : (
              list.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onApprove={() => setStatus.mutate({ id: r.id, status: "approved" })}
                  onDismiss={() => setStatus.mutate({ id: r.id, status: "dismissed" })}
                  onHide={(hide) => r.comment && hideComment.mutate({ commentId: r.comment.id, hide })}
                  onRemove={() => r.comment && setConfirmDelete({ reportId: r.id, commentId: r.comment.id })}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the comment and marks the report as resolved (removed).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) deleteComment.mutate(confirmDelete);
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove comment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReportCard({
  report, onApprove, onDismiss, onHide, onRemove,
}: {
  report: ReportRow;
  onApprove: () => void;
  onDismiss: () => void;
  onHide: (hide: boolean) => void;
  onRemove: () => void;
}) {
  const c = report.comment;
  const isPending = report.status === "pending";
  return (
    <div className="border border-border rounded-lg bg-card p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isPending ? "default" : "secondary"} className="capitalize">
            {report.status}
          </Badge>
          <Badge variant="outline">{REASON_LABEL[report.reason] || report.reason}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNowStrict(new Date(report.created_at), { addSuffix: true })}
          </span>
        </div>
        {c?.is_hidden && <Badge variant="secondary"><EyeOff className="w-3 h-3 mr-1" /> Hidden</Badge>}
      </div>

      {/* Comment body */}
      {c ? (
        <div className="rounded-md bg-muted/40 border border-border/60 p-3">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{c.body}</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            On {c.source} · posted {formatDistanceToNowStrict(new Date(c.created_at), { addSuffix: true })}
          </p>
        </div>
      ) : (
        <div className="rounded-md bg-muted/40 border border-border/60 p-3 text-xs text-muted-foreground italic">
          Comment was already deleted.
        </div>
      )}

      {/* Reporter / Target metadata */}
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <MetaRow label="Reporter" profile={report.reporter} userId={report.reporter_id} />
        <MetaRow label="Comment author" profile={report.target} userId={c?.user_id} />
      </div>

      {/* Reporter details */}
      {report.details && (
        <div className="text-xs">
          <span className="font-semibold text-muted-foreground">Details: </span>
          <span className="text-foreground/80">{report.details}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {c && (
          <Button size="sm" variant="outline" onClick={() => onHide(!c.is_hidden)}>
            {c.is_hidden ? <><Eye className="w-3.5 h-3.5 mr-1.5" /> Unhide</> : <><EyeOff className="w-3.5 h-3.5 mr-1.5" /> Hide</>}
          </Button>
        )}
        {c && (
          <Button size="sm" variant="destructive" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove comment
          </Button>
        )}
        {isPending && (
          <>
            <Button size="sm" variant="default" onClick={onApprove}>
              <Check className="w-3.5 h-3.5 mr-1.5" /> Approve report
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              <ShieldX className="w-3.5 h-3.5 mr-1.5" /> Dismiss
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function MetaRow({
  label, profile, userId,
}: {
  label: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  userId?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 p-2">
      <Avatar className="w-7 h-7">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
          {(profile?.display_name || "U").slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold text-foreground truncate">
          {profile?.display_name || "Unknown user"}
        </p>
        {userId && <p className="text-[10px] text-muted-foreground font-mono truncate">{userId}</p>}
      </div>
    </div>
  );
}
