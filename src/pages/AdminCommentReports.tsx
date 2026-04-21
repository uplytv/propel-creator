import { useEffect, useMemo, useState } from "react";
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Flag, EyeOff, Eye, Trash2, Check, ShieldX, MessageCircle, Download, RefreshCw } from "lucide-react";
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
  const [exportOpen, setExportOpen] = useState(false);

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

  const handleExportCsv = (selected: string[], delimiter: "," | "\t" = ",") => {
    if (!list.length) {
      toast.error("Nothing to export");
      return;
    }
    if (!selected.length) {
      toast.error("Select at least one column");
      return;
    }
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    };
    const fields = ORDERED_KEYS
      .filter((k) => selected.includes(k))
      .map((k) => ({ key: k, get: FIELD_GETTERS[k] }));
    const headers = fields.map((f) => f.key);
    const rows = list.map((r) => fields.map((f) => f.get(r)));
    const csv = [headers, ...rows].map((row) => row.map(escape).join(delimiter)).join("\n");
    const ext = delimiter === "\t" ? "tsv" : "csv";
    const mime = delimiter === "\t" ? "text/tab-separated-values" : "text/csv";
    const blob = new Blob([`\ufeff${csv}`], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comment-reports-${tab}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${list.length} ${tab} report${list.length === 1 ? "" : "s"}`);
    setExportOpen(false);
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
            disabled={isLoading || !list.length}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
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

      <ExportCsvDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        rows={list}
        tab={tab}
        onExport={handleExportCsv}
      />
    </div>
  );
}

const REPORT_FIELDS = [
  { key: "report_id", label: "Report ID" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Reason" },
  { key: "details", label: "Reporter details" },
  { key: "reported_at", label: "Reported at" },
  { key: "reporter_id", label: "Reporter ID" },
  { key: "reporter_name", label: "Reporter name" },
];

const COMMENT_FIELDS = [
  { key: "comment_id", label: "Comment ID" },
  { key: "comment_body", label: "Comment body" },
  { key: "comment_source", label: "Source (clip/short)" },
  { key: "comment_is_hidden", label: "Hidden flag" },
  { key: "comment_posted_at", label: "Comment posted at" },
  { key: "comment_author_id", label: "Comment author ID" },
  { key: "comment_author_name", label: "Comment author name" },
];

const FIELD_GETTERS: Record<string, (r: ReportRow) => unknown> = {
  report_id: (r) => r.id,
  status: (r) => r.status,
  reason: (r) => r.reason,
  details: (r) => r.details ?? "",
  reported_at: (r) => r.created_at,
  reporter_id: (r) => r.reporter_id,
  reporter_name: (r) => r.reporter?.display_name ?? "",
  comment_id: (r) => r.comment?.id ?? "",
  comment_body: (r) => r.comment?.body ?? "",
  comment_source: (r) => r.comment?.source ?? "",
  comment_is_hidden: (r) => r.comment?.is_hidden ?? "",
  comment_posted_at: (r) => r.comment?.created_at ?? "",
  comment_author_id: (r) => r.comment?.user_id ?? "",
  comment_author_name: (r) => r.target?.display_name ?? "",
};

const FIELD_LABEL = [...REPORT_FIELDS, ...COMMENT_FIELDS].reduce<Record<string, string>>(
  (acc, f) => { acc[f.key] = f.label; return acc; }, {}
);

const ORDERED_KEYS = [...REPORT_FIELDS, ...COMMENT_FIELDS].map((f) => f.key);

function ExportCsvDialog({
  open, onOpenChange, rows, tab, onExport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rows: ReportRow[];
  tab: ReportStatus;
  onExport: (selected: string[], delimiter: "," | "\t") => void;
}) {
  const count = rows.length;
  const [preset, setPreset] = useState<"both" | "report" | "comment" | "custom">(() => {
    try {
      const v = localStorage.getItem("admin-csv-export-preset");
      if (v === "both" || v === "report" || v === "comment" || v === "custom") return v;
    } catch { /* ignore */ }
    return "both";
  });
  const [selected, setSelected] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("admin-csv-export-columns");
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr) && arr.length) return new Set(arr);
      }
    } catch { /* ignore */ }
    return new Set([...REPORT_FIELDS, ...COMMENT_FIELDS].map((f) => f.key));
  });
  const [delimiter, setDelimiter] = useState<"," | "\t">(() => {
    try {
      const v = localStorage.getItem("admin-csv-export-delimiter");
      if (v === "\t") return "\t";
    } catch { /* ignore */ }
    return ",";
  });

  // Persist whenever preset or selection changes
  useEffect(() => {
    try {
      localStorage.setItem("admin-csv-export-preset", preset);
      localStorage.setItem("admin-csv-export-columns", JSON.stringify([...selected]));
      localStorage.setItem("admin-csv-export-delimiter", delimiter);
    } catch { /* ignore */ }
  }, [preset, selected, delimiter]);

  const applyPreset = (p: "both" | "report" | "comment" | "custom") => {
    setPreset(p);
    if (p === "both") setSelected(new Set([...REPORT_FIELDS, ...COMMENT_FIELDS].map((f) => f.key)));
    else if (p === "report") setSelected(new Set(REPORT_FIELDS.map((f) => f.key)));
    else if (p === "comment") setSelected(new Set(COMMENT_FIELDS.map((f) => f.key)));
  };

  const toggle = (key: string) => {
    setPreset("custom");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const previewKeys = useMemo(
    () => ORDERED_KEYS.filter((k) => selected.has(k)),
    [selected]
  );
  const [previewNonce, setPreviewNonce] = useState(0);
  const previewRows = useMemo(() => rows.slice(0, 5), [rows, previewNonce]);

  const truncate = (v: unknown, max = 40) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export {tab} reports</DialogTitle>
          <DialogDescription>
            Choose which columns to include. {count} row{count === 1 ? "" : "s"} will be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={preset} onValueChange={(v) => applyPreset(v as typeof preset)} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { v: "both", l: "Both" },
              { v: "report", l: "Report only" },
              { v: "comment", l: "Comment only" },
            ].map((opt) => (
              <Label
                key={opt.v}
                htmlFor={`preset-${opt.v}`}
                className="flex items-center gap-2 rounded-md border border-border p-2.5 cursor-pointer hover:bg-muted/40 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
              >
                <RadioGroupItem id={`preset-${opt.v}`} value={opt.v} />
                <span className="text-sm font-medium">{opt.l}</span>
              </Label>
            ))}
          </RadioGroup>

          {/* Delimiter */}
          <div className="rounded-md border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Delimiter
            </p>
            <RadioGroup
              value={delimiter === "\t" ? "tab" : "comma"}
              onValueChange={(v) => setDelimiter(v === "tab" ? "\t" : ",")}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { v: "comma", l: "Comma (.csv)" },
                { v: "tab", l: "Tab (.tsv)" },
              ].map((opt) => (
                <Label
                  key={opt.v}
                  htmlFor={`delim-${opt.v}`}
                  className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-muted/40 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem id={`delim-${opt.v}`} value={opt.v} />
                  <span className="text-sm font-medium">{opt.l}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <FieldGroup title="Report fields" fields={REPORT_FIELDS} selected={selected} onToggle={toggle} />
            <FieldGroup title="Comment fields" fields={COMMENT_FIELDS} selected={selected} onToggle={toggle} />
          </div>

          {/* CSV Preview */}
          <div className="rounded-md border border-border">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground">
                  Showing {Math.min(previewRows.length, 5)} of {count} row{count === 1 ? "" : "s"}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setPreviewNonce((n) => n + 1)}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
            {previewKeys.length === 0 ? (
              <p className="text-xs text-muted-foreground italic p-3">Select at least one column to preview.</p>
            ) : previewRows.length === 0 ? (
              <p className="text-xs text-muted-foreground italic p-3">No rows to preview.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/20">
                    <tr>
                      {previewKeys.map((k) => (
                        <th key={k} className="text-left font-semibold text-foreground px-3 py-2 whitespace-nowrap border-b border-border">
                          {FIELD_LABEL[k] || k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={r.id} className={i % 2 ? "bg-muted/10" : ""}>
                        {previewKeys.map((k) => (
                          <td key={k} className="px-3 py-1.5 align-top text-foreground/80 whitespace-nowrap">
                            {truncate(FIELD_GETTERS[k]?.(r))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onExport([...selected])} disabled={!selected.size || !count}>
            <Download className="w-4 h-4 mr-1.5" />
            Download CSV ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  title, fields, selected, onToggle,
}: {
  title: string;
  fields: { key: string; label: string }[];
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map((f) => (
          <Label
            key={f.key}
            htmlFor={`col-${f.key}`}
            className="flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1.5 hover:bg-muted/40"
          >
            <Checkbox
              id={`col-${f.key}`}
              checked={selected.has(f.key)}
              onCheckedChange={() => onToggle(f.key)}
            />
            <span className="truncate">{f.label}</span>
          </Label>
        ))}
      </div>
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
