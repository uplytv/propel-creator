import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, History, Pencil, Search } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

const EXPECTED_FEE_PCT = 5;

type EventRow = {
  id: string;
  title: string | null;
  status: string | null;
  platform_fee_pct: number;
  created_at: string;
  creator_id: string | null;
};

export default function AdminEventFees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [onlyMismatches, setOnlyMismatches] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [historyFor, setHistoryFor] = useState<EventRow | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-event-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, platform_fee_pct, created_at, creator_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as EventRow[];
    },
  });

  const { filtered, mismatchCount } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const mismatches = events.filter(
      (e) => Number(e.platform_fee_pct) !== EXPECTED_FEE_PCT,
    );
    const base = onlyMismatches ? mismatches : events;
    const filtered = q
      ? base.filter(
          (e) =>
            (e.title || "").toLowerCase().includes(q) ||
            (e.id || "").toLowerCase().includes(q),
        )
      : base;
    return { filtered, mismatchCount: mismatches.length };
  }, [events, search, onlyMismatches]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl mobile-safe-content">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Event Platform Fees</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Expected default:{" "}
            <span className="text-primary font-medium">{EXPECTED_FEE_PCT}%</span>. Any
            event with a different value is flagged.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">Total events</div>
            <div className="text-2xl font-bold mt-1">{events.length}</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">
              At default ({EXPECTED_FEE_PCT}%)
            </div>
            <div className="text-2xl font-bold mt-1 text-primary">
              {events.length - mismatchCount}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
            <div className="text-xs text-muted-foreground">Mismatches</div>
            <div className="text-2xl font-bold mt-1 text-destructive">
              {mismatchCount}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or event ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <button
            onClick={() => setOnlyMismatches((v) => !v)}
            className={`h-11 px-4 rounded-md border text-sm font-medium transition-colors ${
              onlyMismatches
                ? "bg-destructive/15 border-destructive/40 text-destructive"
                : "bg-white/[0.03] border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            {onlyMismatches ? "Showing mismatches only" : "Show mismatches only"}
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm">
            No events match the current filters.
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Event</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Fee %</th>
                  <th className="text-right px-4 py-3 font-medium">Check</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const fee = Number(e.platform_fee_pct);
                  const ok = fee === EXPECTED_FEE_PCT;
                  return (
                    <tr key={e.id} className="border-t border-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-[260px]">
                          {e.title || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate max-w-[260px]">
                          {e.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs border-white/10">
                          {e.status || "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {Number.isFinite(fee) ? `${fee}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {ok ? (
                          <span className="inline-flex items-center gap-1 text-primary text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Default
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive text-xs">
                            <AlertTriangle className="h-3.5 w-3.5" /> Mismatch
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setHistoryFor(e)}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => setEditing(e)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <FeeChangeHistoryPanel events={events} />
        </div>
      </div>

      <EditFeeDialog
        event={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-event-fees"] });
          queryClient.invalidateQueries({ queryKey: ["admin-fee-change-history"] });
          setEditing(null);
        }}
      />
      <HistoryDialog event={historyFor} onClose={() => setHistoryFor(null)} />
    </AppLayout>
  );
}

function EditFeeDialog({
  event,
  onClose,
  onSaved,
}: {
  event: EventRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ fee?: string; reason?: string }>({});

  // reset fields when the event being edited changes
  useMemo(() => {
    if (event) {
      setValue(String(event.platform_fee_pct ?? ""));
      setReason("");
      setErrors({});
    }
  }, [event?.id]);

  const validate = (): boolean => {
    const next: { fee?: string; reason?: string } = {};
    const raw = value.trim();
    if (raw === "") {
      next.fee = "Fee is required";
    } else if (!/^-?\d+(\.\d+)?$/.test(raw)) {
      next.fee = "Fee must be a valid number";
    } else {
      const num = Number(raw);
      if (!Number.isFinite(num)) {
        next.fee = "Fee must be a finite number";
      } else if (num < 0) {
        next.fee = "Fee cannot be negative";
      } else if (num > 100) {
        next.fee = "Fee cannot exceed 100%";
      } else if (raw.includes(".") && raw.split(".")[1].length > 2) {
        next.fee = "Fee supports up to 2 decimal places";
      }
    }
    if (!reason.trim()) {
      next.reason = "Reason is required";
    } else if (reason.trim().length < 5) {
      next.reason = "Reason must be at least 5 characters";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!event || !validate()) return;
    const num = Number(value.trim());
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_update_event_fee" as any, {
        _event_id: event.id,
        _new_fee_pct: num,
        _reason: reason.trim(),
      });
      if (error) throw error;

      toast.success("Fee updated", {
        description: `Event fee set to ${num}%. Change logged.`,
      });
      onSaved();
    } catch (err: any) {
      toast.error("Update failed", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update platform fee</DialogTitle>
          <DialogDescription>
            {event?.title || "Event"} — current fee:{" "}
            <span className="font-mono">{event?.platform_fee_pct}%</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fee">New fee %</Label>
            <Input
              id="fee"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (errors.fee) setErrors((p) => ({ ...p, fee: undefined }));
              }}
              aria-invalid={!!errors.fee}
              className={errors.fee ? "border-destructive" : ""}
            />
            {errors.fee && (
              <p className="text-xs text-destructive">{errors.fee}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g. Negotiated rate for partner creator"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errors.reason) setErrors((p) => ({ ...p, reason: undefined }));
              }}
              aria-invalid={!!errors.reason}
              className={errors.reason ? "border-destructive" : ""}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({
  event,
  onClose,
}: {
  event: EventRow | null;
  onClose: () => void;
}) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["event-fee-history", event?.id],
    enabled: !!event,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_fee_change_log" as any)
        .select("*")
        .eq("event_id", event!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fee change history</DialogTitle>
          <DialogDescription>
            {event?.title || "Event"} — all logged changes
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No changes recorded for this event.
            </p>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono">
                    {h.old_fee_pct ?? "—"}% → {h.new_fee_pct}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(h.created_at), "PP p")}
                  </div>
                </div>
                {h.reason && (
                  <div className="text-xs text-muted-foreground mt-1">{h.reason}</div>
                )}
                {h.changed_by && (
                  <div className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                    by {h.changed_by}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
