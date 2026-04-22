import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, BellRing, Check, X, Clock, Ticket, Loader2, Inbox, RefreshCw, Search, History, ShieldCheck, ShieldX, User as UserIcon } from "lucide-react";
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
    const channel = (supabase as any)
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
      (supabase as any).removeChannel(channel);
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
      await (supabase as any).from("notifications").insert({
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
      const { data: prof } = await (supabase as any)
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

    await (supabase as any)
      .from("notifications")
      .update({ read: true, metadata: nextMetadata })
      .eq("id", req.id);

    return nextLog;
  };

  const approve = async (req: ReentryNotification) => {
    if (actionId) return;
    setActionId(req.id);
    const ticketId = req.metadata?.ticket_id || req.reference_id;
    const eventTitle = req.metadata?.event_title || "the event";
    const guestUserId = req.metadata?.guest_user_id;
    const ticketUrl = req.metadata?.ticket_url || (ticketId ? `/tickets/${ticketId}` : null);

    try {
      if (ticketId) {
        // Re-activate the ticket so the QR scans clean again
        const { error } = await (supabase as any)
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

      // Mark notification as handled + write audit entry
      const nextLog = await recordAudit(req, "approved");

      // Best-effort guest notification
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
    const eventTitle = req.metadata?.event_title || "the event";
    const guestUserId = req.metadata?.guest_user_id;
    const ticketUrl = req.metadata?.ticket_url || null;

    try {
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
      if (navigator.vibrate) navigator.vibrate(40);
      toast.success("Request denied", { description: "We've let the guest know." });
    } catch (e: any) {
      toast.error("Couldn't deny", { description: e?.message || "Try again." });
    } finally {
      setActionId(null);
    }
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
                } ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg" : ""}`}
              >
                <div className="flex items-start gap-3">
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
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1.5">
                      <History className="w-3 h-3" />
                      Activity log
                    </p>
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
    </div>
  );
}
