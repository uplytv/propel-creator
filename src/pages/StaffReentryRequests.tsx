import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BellRing, Check, X, Clock, Ticket, Loader2, Inbox, RefreshCw, Search, History, ShieldCheck, ShieldX, User as UserIcon, CheckSquare, Square, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type ReentryNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  reference_id: string | null;
  link: string | null;
  metadata: any;
  // local UI flags
  _resolved?: "approved" | "denied" | null;
};

type FilterTab = "pending" | "resolved" | "all";

export default function StaffReentryRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusRequestId = searchParams.get("request");
  const focusTicketId = searchParams.get("ticket");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ReentryNotification[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>(focusRequestId || focusTicketId ? "all" : "pending");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<null | "approve" | "deny">(null);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("notifications")
      .select("id, title, message, read, created_at, reference_id, link, metadata")
      .eq("user_id", user.id)
      .eq("type", "ticket_reentry_request")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error("Couldn't load re-entry requests");
    } else {
      setRequests((data as ReentryNotification[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  // Realtime: prepend new requests
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("staff-reentry-requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const n = payload.new;
          if (n?.type !== "ticket_reentry_request") return;
          setRequests((prev) => [n as ReentryNotification, ...prev]);
          if (navigator.vibrate) navigator.vibrate(40);
          toast.info("New re-entry request", {
            description: n.title?.replace(/^🔁\s*/, "") || "A guest needs re-entry",
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Deep-link focus: when arriving with ?request=<id> or ?ticket=<id>, scroll to and highlight it
  useEffect(() => {
    if (!focusRequestId && !focusTicketId) return;
    if (loading || requests.length === 0) return;
    const target = requests.find(
      (r) =>
        (focusRequestId && r.id === focusRequestId) ||
        (focusTicketId &&
          (r.metadata?.ticket_id === focusTicketId || r.reference_id === focusTicketId))
    );
    if (!target) return;
    setHighlightedId(target.id);
    // Wait one frame for the card to mount in the filtered list
    requestAnimationFrame(() => {
      const el = cardRefs.current[target.id];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // Auto-fade highlight after a few seconds
    const t = setTimeout(() => setHighlightedId(null), 4000);
    // Clear query params so refresh doesn't re-trigger
    const tidy = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("request");
      next.delete("ticket");
      setSearchParams(next, { replace: true });
    }, 1500);
    return () => {
      clearTimeout(t);
      clearTimeout(tidy);
    };
  }, [focusRequestId, focusTicketId, loading, requests, searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    let list = requests;
    if (tab === "pending") list = list.filter((r) => !r.read && !r._resolved);
    else if (tab === "resolved") list = list.filter((r) => r.read || !!r._resolved);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const name = (r.metadata?.guest_name || "").toLowerCase();
        const token = (r.metadata?.ticket_token || "").toLowerCase();
        const evt = (r.metadata?.event_title || "").toLowerCase();
        return name.includes(q) || token.includes(q) || evt.includes(q);
      });
    }
    return list;
  }, [requests, tab, search]);

  const pendingCount = requests.filter((r) => !r.read && !r._resolved).length;

  const notifyGuest = async (
    guestUserId: string | null | undefined,
    approved: boolean,
    eventTitle: string,
    ticketUrl: string | null
  ) => {
    if (!guestUserId) return;
    try {
      await supabase.from("notifications").insert({
        user_id: guestUserId,
        type: approved ? "ticket_reentry_approved" : "ticket_reentry_denied",
        title: approved ? "✅ Re-entry approved" : "🚫 Re-entry denied",
        message: approved
          ? `You're cleared to re-enter "${eventTitle}". Show your QR code at the door.`
          : `Your re-entry request for "${eventTitle}" was declined by staff.`,
        actor_id: user?.id ?? null,
        link: ticketUrl,
      });
    } catch {
      // silent — staff action still succeeds
    }
  };

  const recordAudit = async (
    req: ReentryNotification,
    action: "approved" | "denied"
  ): Promise<any[]> => {
    // Resolve current actor's display name (best-effort)
    let actorName = "Staff";
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user!.id)
        .maybeSingle();
      actorName =
        prof?.display_name ||
        prof?.username ||
        user?.email?.split("@")[0] ||
        "Staff";
    } catch {
      // fall back to default
    }

    const existingLog: any[] = Array.isArray(req.metadata?.audit_log)
      ? req.metadata.audit_log
      : [];
    const entry = {
      action,
      actor_id: user?.id ?? null,
      actor_name: actorName,
      at: new Date().toISOString(),
    };
    const nextLog = [...existingLog, entry];
    const nextMetadata = { ...(req.metadata || {}), audit_log: nextLog };

    await supabase
      .from("notifications")
      .update({ read: true, metadata: nextMetadata })
      .eq("id", req.id);

    return nextLog;
  };

  // Core approve — no UI guards/toasts so it can be reused for bulk
  const approveCore = async (req: ReentryNotification) => {
    const ticketId = req.metadata?.ticket_id || req.reference_id;
    const eventTitle = req.metadata?.event_title || "the event";
    const guestUserId = req.metadata?.guest_user_id;
    const ticketUrl = req.metadata?.ticket_url || (ticketId ? `/tickets/${ticketId}` : null);

    if (ticketId) {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: "active",
          checked_in: false,
          checked_in_at: null,
          scanned_at: null,
        })
        .eq("id", ticketId);
      if (error) throw error;
    }

    const nextLog = await recordAudit(req, "approved");
    await notifyGuest(guestUserId, true, eventTitle, ticketUrl);

    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              read: true,
              _resolved: "approved",
              metadata: { ...(r.metadata || {}), audit_log: nextLog },
            }
          : r
      )
    );
  };

  const denyCore = async (req: ReentryNotification) => {
    const eventTitle = req.metadata?.event_title || "the event";
    const guestUserId = req.metadata?.guest_user_id;
    const ticketUrl = req.metadata?.ticket_url || null;

    const nextLog = await recordAudit(req, "denied");
    await notifyGuest(guestUserId, false, eventTitle, ticketUrl);

    setRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              read: true,
              _resolved: "denied",
              metadata: { ...(r.metadata || {}), audit_log: nextLog },
            }
          : r
      )
    );
  };

  const approve = async (req: ReentryNotification) => {
    if (actionId) return;
    setActionId(req.id);
    try {
      await approveCore(req);
      if (navigator.vibrate) navigator.vibrate(60);
      toast.success("Re-entry approved", { description: "Ticket reactivated for scanning." });
    } catch (e: any) {
      toast.error("Couldn't approve", { description: e?.message || "Try again." });
    } finally {
      setActionId(null);
    }
  };

  const deny = async (req: ReentryNotification) => {
    if (actionId) return;
    setActionId(req.id);
    try {
      await denyCore(req);
      if (navigator.vibrate) navigator.vibrate(40);
      toast.success("Request denied", { description: "We've let the guest know." });
    } catch (e: any) {
      toast.error("Couldn't deny", { description: e?.message || "Try again." });
    } finally {
      setActionId(null);
    }
  };

  // ---------- Selection + Bulk actions ----------
  const pendingFilteredIds = useMemo(
    () => filtered.filter((r) => !r.read && !r._resolved).map((r) => r.id),
    [filtered]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    pendingFilteredIds.length > 0 &&
    pendingFilteredIds.every((id) => selectedIds.has(id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        pendingFilteredIds.forEach((id) => next.delete(id));
      } else {
        pendingFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const undoBulk = async (
    snapshots: ReentryNotification[],
    mode: "approve" | "deny"
  ) => {
    try {
      // Roll the notifications back to their pre-bulk state (read=false, prior metadata)
      await Promise.all(
        snapshots.map((s) =>
          supabase
            .from("notifications")
            .update({ read: false, metadata: s.metadata ?? {} })
            .eq("id", s.id)
        )
      );

      // For approve: revert ticket reactivation back to a used state
      if (mode === "approve") {
        await Promise.all(
          snapshots.map((s) => {
            const ticketId = s.metadata?.ticket_id || s.reference_id;
            if (!ticketId) return Promise.resolve();
            return supabase
              .from("tickets")
              .update({ status: "used", checked_in: true, checked_in_at: new Date().toISOString() })
              .eq("id", ticketId);
          })
        );
      }

      // Restore local state from snapshots
      setRequests((prev) =>
        prev.map((r) => {
          const snap = snapshots.find((s) => s.id === r.id);
          return snap ? { ...snap, _resolved: null } : r;
        })
      );

      toast.success("Action undone", {
        description: `${snapshots.length} request${snapshots.length === 1 ? "" : "s"} restored.`,
      });
    } catch (e: any) {
      toast.error("Couldn't undo", { description: e?.message || "Try again." });
    }
  };

  const runBulk = async (mode: "approve" | "deny") => {
    if (bulkBusy) return;
    const targets = requests.filter(
      (r) => selectedIds.has(r.id) && !r.read && !r._resolved
    );
    if (targets.length === 0) {
      toast.info("Nothing to process", { description: "Select pending requests first." });
      return;
    }

    // Snapshot pre-bulk state for undo
    const snapshots: ReentryNotification[] = targets.map((t) => ({
      ...t,
      metadata: t.metadata ? JSON.parse(JSON.stringify(t.metadata)) : {},
    }));

    setBulkBusy(mode);
    setBulkProgress({ done: 0, total: targets.length });
    let success = 0;
    let failed = 0;
    const succeededIds: string[] = [];

    for (let i = 0; i < targets.length; i++) {
      const req = targets[i];
      try {
        if (mode === "approve") await approveCore(req);
        else await denyCore(req);
        success++;
        succeededIds.push(req.id);
      } catch {
        failed++;
      }
      setBulkProgress({ done: i + 1, total: targets.length });
    }

    setBulkBusy(null);
    setBulkProgress(null);
    setSelectedIds(new Set());
    if (navigator.vibrate) navigator.vibrate(80);

    const verb = mode === "approve" ? "approved" : "denied";
    const undoSnapshots = snapshots.filter((s) => succeededIds.includes(s.id));
    const undoOpts =
      undoSnapshots.length > 0
        ? {
            duration: 8000,
            action: {
              label: "Undo",
              onClick: () => undoBulk(undoSnapshots, mode),
            },
          }
        : {};

    if (failed === 0) {
      toast.success(`Bulk ${verb}`, {
        description: `${success} request${success === 1 ? "" : "s"} ${verb}.`,
        ...undoOpts,
      });
    } else {
      toast.warning(`Bulk ${verb} with errors`, {
        description: `${success} ok · ${failed} failed`,
        ...undoOpts,
      });
    }
  };

  const selectedPendingCount = useMemo(
    () =>
      requests.filter((r) => selectedIds.has(r.id) && !r.read && !r._resolved)
        .length,
    [requests, selectedIds]
  );

  // Robust copy with execCommand fallback for blocked/unavailable clipboard API
  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Preferred: async clipboard API (requires secure context + permission)
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function" &&
      window.isSecureContext
    ) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to legacy fallback
      }
    }

    // Fallback: hidden textarea + document.execCommand('copy')
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.setAttribute("aria-hidden", "true");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);

      // iOS needs an editable, focused, fully-selected element
      const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        const range = document.createRange();
        range.selectNodeContents(ta);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        ta.setSelectionRange(0, text.length);
      } else {
        ta.focus();
        ta.select();
      }

      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const exportAudit = (req: ReentryNotification, format: "csv" | "json") => {
    const log: any[] = Array.isArray(req.metadata?.audit_log) ? req.metadata.audit_log : [];
    if (log.length === 0) {
      toast.info("Nothing to export", { description: "No activity recorded yet." });
      return;
    }
    const guestName = req.metadata?.guest_name || "guest";
    const eventTitle = req.metadata?.event_title || "event";
    const ticketToken = req.metadata?.ticket_token || "";
    const safe = (s: string) =>
      String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "request";
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `reentry-activity_${safe(guestName)}_${safe(eventTitle)}_${stamp}`;

    let blob: Blob;
    let filename: string;
    if (format === "json") {
      const payload = {
        request_id: req.id,
        created_at: req.created_at,
        guest_name: guestName,
        event_title: eventTitle,
        ticket_token: ticketToken,
        ticket_id: req.metadata?.ticket_id || req.reference_id || null,
        audit_log: log,
        exported_at: new Date().toISOString(),
        exported_by: user?.id ?? null,
      };
      blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      filename = `${baseName}.json`;
    } else {
      const escape = (v: any) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const headers = [
        "request_id",
        "guest_name",
        "event_title",
        "ticket_token",
        "action",
        "actor_name",
        "actor_id",
        "at",
      ];
      const rows = log.map((e) => [
        req.id,
        guestName,
        eventTitle,
        ticketToken,
        e.action,
        e.actor_name || "",
        e.actor_id || "",
        e.at || "",
      ]);
      const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
      blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      filename = `${baseName}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const exportedAt = new Date();
    const timeLabel = exportedAt.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
    const clipboardText = `${filename} · ${format.toUpperCase()} · ${exportedAt.toLocaleString()}`;
    toast.success(`Exported as ${format.toUpperCase()}`, {
      description: `${filename} · ${timeLabel}`,
      duration: 6000,
      action: {
        label: "Copy",
        onClick: async () => {
          const ok = await copyToClipboard(clipboardText);
          if (ok) {
            toast.success("Copied to clipboard", { description: clipboardText });
          } else {
            toast.error("Couldn't copy", {
              description: "Your browser blocked clipboard access.",
            });
          }
        },
      },
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Please sign in to view re-entry requests.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold flex items-center gap-2 truncate">
              <BellRing className="w-4 h-4 text-primary" />
              Re-entry requests
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {pendingCount > 0
                ? `${pendingCount} pending · approve to reactivate ticket`
                : "All caught up"}
            </p>
          </div>
          <button
            onClick={load}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2 flex gap-1.5">
          {(["pending", "resolved", "all"] as FilterTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {t}
              {t === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-background text-foreground text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by guest name or ticket #"
              className="w-full h-9 pl-8 pr-8 rounded-lg bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-background/60 text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Select all (only when there are pending requests visible) */}
        {pendingFilteredIds.length > 0 && (
          <div className="px-4 pb-3 flex items-center justify-between">
            <button
              onClick={toggleSelectAllVisible}
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {allVisibleSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {allVisibleSelected
                ? `Deselect all (${pendingFilteredIds.length})`
                : `Select all pending (${pendingFilteredIds.length})`}
            </button>
            {selectedPendingCount > 0 && (
              <button
                onClick={clearSelection}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="px-4 py-4 space-y-3">
        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Inbox className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">No {tab === "all" ? "" : tab} requests</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
              When a guest taps "Request re-entry" from their ticket, it'll show up here for staff
              review.
            </p>
          </div>
        ) : (
          filtered.map((req) => {
            const isResolved = req._resolved || req.read;
            const guestName = req.metadata?.guest_name || "A guest";
            const eventTitle = req.metadata?.event_title || "Event";
            const eventUrl = req.metadata?.event_url || null;
            const ticketUrl = req.metadata?.ticket_url || null;
            const shortToken = (req.metadata?.ticket_token || "")?.slice(0, 8);
            const auditLog: any[] = Array.isArray(req.metadata?.audit_log)
              ? req.metadata.audit_log
              : [];
            const isBusy = actionId === req.id;

            const isHighlighted = highlightedId === req.id;
            return (
              <div
                key={req.id}
                ref={(el) => (cardRefs.current[req.id] = el)}
                className={`rounded-2xl border p-4 transition-all ${
                  isResolved
                    ? "border-border bg-muted/30"
                    : "border-primary/30 bg-primary/5"
                } ${
                  selectedIds.has(req.id) && !isResolved
                    ? "ring-2 ring-primary/60"
                    : ""
                } ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {!isResolved && (
                    <button
                      onClick={() => toggleSelect(req.id)}
                      className="mt-1 flex-shrink-0 p-0.5 -ml-0.5 rounded hover:bg-muted transition-colors"
                      aria-label={selectedIds.has(req.id) ? "Deselect" : "Select"}
                      disabled={!!bulkBusy}
                    >
                      {selectedIds.has(req.id) ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isResolved ? "bg-muted" : "bg-primary/15 text-primary"
                    }`}
                  >
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate">{guestName}</p>
                      {req._resolved === "approved" && (
                        <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                          Approved
                        </Badge>
                      )}
                      {req._resolved === "denied" && (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15">
                          Denied
                        </Badge>
                      )}
                      {!req._resolved && req.read && (
                        <Badge variant="outline" className="text-[10px]">
                          Handled
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {eventTitle}
                      {shortToken && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5">
                          · <Ticket className="w-3 h-3 inline" /> #{shortToken}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Quick deep links */}
                {(ticketUrl || eventUrl) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ticketUrl && (
                      <button
                        onClick={() => navigate(ticketUrl)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/70 text-foreground transition-colors"
                      >
                        View ticket
                      </button>
                    )}
                    {eventUrl && (
                      <button
                        onClick={() => navigate(eventUrl)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/70 text-foreground transition-colors"
                      >
                        View event
                      </button>
                    )}
                  </div>
                )}

                {/* Actions */}
                {!isResolved && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => deny(req)}
                      disabled={isBusy}
                      variant="outline"
                      size="sm"
                      className="h-9"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 mr-1.5" />
                          Deny
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => approve(req)}
                      disabled={isBusy}
                      size="sm"
                      className="h-9"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Approve
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Audit log */}
                {auditLog.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Activity log
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => exportAudit(req, "csv")}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-muted hover:bg-muted/70 text-foreground transition-colors"
                          aria-label="Export activity as CSV"
                        >
                          <Download className="w-2.5 h-2.5" />
                          CSV
                        </button>
                        <button
                          onClick={() => exportAudit(req, "json")}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-muted hover:bg-muted/70 text-foreground transition-colors"
                          aria-label="Export activity as JSON"
                        >
                          <Download className="w-2.5 h-2.5" />
                          JSON
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {auditLog.map((entry, i) => {
                        const approved = entry.action === "approved";
                        return (
                          <li
                            key={`${req.id}-audit-${i}`}
                            className="flex items-start gap-2 text-[11px]"
                          >
                            <span
                              className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 ${
                                approved
                                  ? "bg-primary/15 text-primary"
                                  : "bg-destructive/15 text-destructive"
                              }`}
                            >
                              {approved ? (
                                <ShieldCheck className="w-2.5 h-2.5" />
                              ) : (
                                <ShieldX className="w-2.5 h-2.5" />
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground">
                                <span className="font-semibold inline-flex items-center gap-1">
                                  <UserIcon className="w-2.5 h-2.5" />
                                  {entry.actor_name || "Staff"}
                                </span>{" "}
                                <span className="text-muted-foreground">
                                  {approved ? "approved" : "denied"} this request
                                </span>
                              </p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {entry.at
                                  ? formatDistanceToNow(new Date(entry.at), { addSuffix: true })
                                  : "just now"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky bulk action bar */}
      {selectedPendingCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
          <div className="rounded-2xl border border-primary/30 bg-background/95 backdrop-blur shadow-2xl px-3 py-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">
                {selectedPendingCount} selected
              </p>
              {bulkProgress ? (
                <p className="text-[10px] text-muted-foreground">
                  Processing {bulkProgress.done}/{bulkProgress.total}…
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Approve reactivates tickets · Deny notifies guests
                </p>
              )}
            </div>
            <Button
              onClick={() => runBulk("deny")}
              disabled={!!bulkBusy}
              variant="outline"
              size="sm"
              className="h-9"
            >
              {bulkBusy === "deny" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Deny
                </>
              )}
            </Button>
            <Button
              onClick={() => runBulk("approve")}
              disabled={!!bulkBusy}
              size="sm"
              className="h-9"
            >
              {bulkBusy === "approve" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Approve
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
