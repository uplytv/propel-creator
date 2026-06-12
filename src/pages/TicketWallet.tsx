import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, isBefore, isAfter } from "date-fns";
import { Ticket, CalendarDays, MapPin, ChevronRight, QrCode, Search, X, Maximize2, CheckCircle2, AlertTriangle, XCircle, Loader2, History, Clock, BellRing, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import AppLayout from "@/components/layout/AppLayout";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type TicketRow = {
  id: string;
  qr_code_token: string;
  status: "active" | "used" | "refunded" | "canceled";
  amount_paid: number;
  created_at: string;
  checked_in_at: string | null;
  scanned_at: string | null;
  events: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    cover_image_url: string | null;
    location_name: string | null;
    event_type: string | null;
  } | null;
};

type Bucket = "upcoming" | "past" | "all";

export default function TicketWallet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bucket, setBucket] = useState<Bucket>("upcoming");
  const [search, setSearch] = useState("");
  const [qrTicket, setQrTicket] = useState<TicketRow | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tickets")
        .select("id, qr_code_token, status, amount_paid, created_at, checked_in_at, scanned_at, events:event_id(id,title,starts_at,ends_at,cover_image_url,location_name,event_type)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TicketRow[];
    },
  });

  const filtered = useMemo(() => {
    const now = new Date();
    const list = (tickets || []).filter((t) => {
      if (!t.events) return bucket === "all";
      const ends = new Date(t.events.ends_at);
      if (bucket === "upcoming") return isAfter(ends, now) && t.status !== "refunded" && t.status !== "canceled";
      if (bucket === "past") return isBefore(ends, now) || t.status === "used";
      return true;
    });
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((t) =>
      (t.events?.title || "").toLowerCase().includes(q) ||
      (t.events?.location_name || "").toLowerCase().includes(q) ||
      t.qr_code_token.toLowerCase().includes(q)
    );
  }, [tickets, bucket, search]);

  const counts = useMemo(() => {
    const now = new Date();
    let upcoming = 0;
    let past = 0;
    (tickets || []).forEach((t) => {
      if (!t.events) return;
      const ends = new Date(t.events.ends_at);
      if (isAfter(ends, now) && t.status !== "refunded" && t.status !== "canceled") upcoming += 1;
      else past += 1;
    });
    return { upcoming, past, all: tickets?.length || 0 };
  }, [tickets]);

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <Ticket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Sign in to view your tickets</h1>
          <Button onClick={() => navigate("/auth?redirect=/tickets")}>Sign in</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEOHead title="My Tickets · UPLY" description="View and manage all your event tickets in one place." />
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gradient">My Tickets</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All your passes in one wallet</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brand-gradient brand-glow flex items-center justify-center">
            <Ticket className="w-5 h-5 text-white" />
          </div>
        </header>

        {/* Bucket tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
          {([
            { id: "upcoming", label: "Upcoming", count: counts.upcoming },
            { id: "past", label: "Past", count: counts.past },
            { id: "all", label: "All", count: counts.all },
          ] as const).map((b) => (
            <button
              key={b.id}
              onClick={() => setBucket(b.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                bucket === b.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.label} <span className="opacity-60">({b.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event, venue, or ticket ID"
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title={bucket === "upcoming" ? "No upcoming tickets" : bucket === "past" ? "No past tickets" : "No tickets yet"}
            description="When you buy or claim a ticket, it'll show up here."
            actionLabel="Browse events"
            onAction={() => navigate("/events")}
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((t) => {
              const event = t.events;
              const isPast = event ? isBefore(new Date(event.ends_at), new Date()) : false;
              return (
                <li key={t.id}>
                  <div className="flex gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors group">
                    <button
                      type="button"
                      onClick={() => setQrTicket(t)}
                      aria-label="Show QR code"
                      className="relative flex-shrink-0 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {event?.cover_image_url ? (
                        <img
                          src={event.cover_image_url}
                          alt={event.title}
                          loading="lazy"
                          className="w-24 h-24 object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-muted flex items-center justify-center">
                          <QrCode className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <span className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-foreground">
                          <QrCode className="w-3.5 h-3.5" /> Tap for QR
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/tickets/${t.qr_code_token}`)}
                      className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-left"
                    >
                      <div>
                        <h3 className="text-sm md:text-base font-semibold text-foreground truncate">
                          {event?.title || "Event"}
                        </h3>
                        {event && (
                          <p className="text-xs text-primary mt-0.5 flex items-center gap-1.5">
                            <CalendarDays className="w-3 h-3" />
                            {format(new Date(event.starts_at), "EEE MMM d · h:mm a")}
                          </p>
                        )}
                        {event?.location_name && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" /> {event.location_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {t.status === "active" && !isPast && (
                          <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[10px]">Active</Badge>
                        )}
                        {t.status === "used" && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">Checked In</Badge>
                        )}
                        {t.status === "refunded" && (
                          <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Refunded</Badge>
                        )}
                        {t.status === "canceled" && (
                          <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Canceled</Badge>
                        )}
                        {isPast && t.status !== "used" && t.status !== "refunded" && t.status !== "canceled" && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">Ended</Badge>
                        )}
                        {t.amount_paid > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-auto">${t.amount_paid.toFixed(2)}</span>
                        )}
                      </div>
                    </button>
                    <div className="flex flex-col items-center justify-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setQrTicket(t)}
                        aria-label="Show QR code"
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Full-screen QR preview */}
      <Dialog open={!!qrTicket} onOpenChange={(open) => !open && setQrTicket(null)}>
        <DialogContent
          className="max-w-md p-0 border-0 bg-background sm:rounded-2xl overflow-hidden"
        >
          <VisuallyHidden>
            <DialogTitle>Ticket QR Code</DialogTitle>
          </VisuallyHidden>
          {qrTicket && (
            <TicketQrModalBody
              ticket={qrTicket}
              onClose={() => setQrTicket(null)}
              onViewDetails={() => {
                const t = qrTicket;
                setQrTicket(null);
                navigate(`/tickets/${t.qr_code_token}`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

const REFRESH_SECONDS = 30;

type LiveStatus = TicketRow["status"];

function statusIcon(s: LiveStatus | "purchased") {
  if (s === "used") return CheckCircle2;
  if (s === "refunded" || s === "canceled") return XCircle;
  if (s === "purchased") return Ticket;
  return QrCode;
}

function statusTone(s: LiveStatus | "purchased") {
  if (s === "used") return "text-primary";
  if (s === "refunded" || s === "canceled") return "text-destructive";
  return "text-muted-foreground";
}

function TicketQrModalBody({
  ticket,
  onClose,
  onViewDetails,
}: {
  ticket: TicketRow;
  onClose: () => void;
  onViewDetails: () => void;
}) {
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(ticket.status);
  const [justChanged, setJustChanged] = useState(false);
  const [checkInAt, setCheckInAt] = useState<string | null>(ticket.checked_in_at);

  type HistoryEntry = {
    id: string;
    status: LiveStatus | "purchased";
    label: string;
    at: string;
    source?: string;
  };

  const seedHistory = useMemo<HistoryEntry[]>(() => {
    const items: HistoryEntry[] = [
      {
        id: `purchased-${ticket.id}`,
        status: "purchased",
        label: "Ticket purchased",
        at: ticket.created_at,
      },
    ];
    const scanAt = ticket.checked_in_at || ticket.scanned_at;
    if (ticket.status === "used" && scanAt) {
      items.push({
        id: `checkin-${ticket.id}`,
        status: "used",
        label: "Checked in at gate",
        at: scanAt,
        source: "Scanner",
      });
    }
    if (ticket.status === "refunded") {
      items.push({
        id: `refund-${ticket.id}`,
        status: "refunded",
        label: "Refund processed",
        at: ticket.created_at,
      });
    }
    if (ticket.status === "canceled") {
      items.push({
        id: `cancel-${ticket.id}`,
        status: "canceled",
        label: "Ticket canceled",
        at: ticket.created_at,
      });
    }
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [ticket]);

  const [history, setHistory] = useState<HistoryEntry[]>(seedHistory);

  // Reset when modal opens with a new ticket
  useEffect(() => {
    setLiveStatus(ticket.status);
    setJustChanged(false);
    setCheckInAt(ticket.checked_in_at);
    setHistory(seedHistory);
  }, [ticket.id, ticket.status, ticket.checked_in_at, seedHistory]);

  // Subscribe to realtime updates for this ticket
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-status-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticket.id}`,
        },
        (payload: any) => {
          const next = payload.new as {
            status: LiveStatus;
            checked_in_at?: string | null;
            scanned_at?: string | null;
          };
          if (next.status && next.status !== liveStatus) {
            setLiveStatus(next.status);
            setJustChanged(true);
            const at = next.checked_in_at || next.scanned_at || new Date().toISOString();
            if (next.status === "used") setCheckInAt(at);
            const labelMap: Record<LiveStatus, string> = {
              active: "Reactivated",
              used: "Checked in at gate",
              refunded: "Refund processed",
              canceled: "Ticket canceled",
            };
            setHistory((prev) => [
              {
                id: `evt-${Date.now()}`,
                status: next.status,
                label: labelMap[next.status] || next.status,
                at,
                source: next.status === "used" ? "Scanner" : undefined,
              },
              ...prev,
            ]);
            if (navigator.vibrate) navigator.vibrate(120);
          }
        }
      )
      .subscribe();

    // Refetch on mount in case scanner updated while modal was closed
    (async () => {
      const { data } = await (supabase as any)
        .from("tickets")
        .select("status, checked_in_at, scanned_at")
        .eq("id", ticket.id)
        .maybeSingle();
      if (data?.status && data.status !== liveStatus) {
        setLiveStatus(data.status);
        if (data.status === "used") {
          const at = data.checked_in_at || data.scanned_at;
          if (at) setCheckInAt(at);
        }
      }
    })();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const banner = useMemo(() => {
    switch (liveStatus) {
      case "used":
        return {
          icon: CheckCircle2,
          tone: "success" as const,
          title: "✓ Checked In",
          body: checkInAt
            ? `Welcome in! Scanned ${format(new Date(checkInAt), "h:mm a")}`
            : "Welcome in — your ticket has been validated.",
        };
      case "refunded":
        return {
          icon: XCircle,
          tone: "destructive" as const,
          title: "Refunded",
          body: "This ticket has been refunded and is no longer valid.",
        };
      case "canceled":
        return {
          icon: XCircle,
          tone: "destructive" as const,
          title: "Canceled",
          body: "This ticket was canceled and cannot be used for entry.",
        };
      case "active":
      default:
        return null;
    }
  }, [liveStatus, checkInAt]);

  const isInvalid = liveStatus !== "active";

  return (
    <div className="flex flex-col items-center p-6 gap-4">
      <div className="w-full flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-in pass</p>
          <h2 className="text-lg font-bold text-foreground truncate">
            {ticket.events?.title || "Event"}
          </h2>
          {ticket.events && (
            <p className="text-xs text-primary mt-0.5">
              {format(new Date(ticket.events.starts_at), "EEE MMM d · h:mm a")}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`w-full flex items-start gap-3 p-3 rounded-xl border ${
            banner.tone === "success"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          } ${justChanged ? "animate-in fade-in zoom-in-95 duration-300" : ""}`}
        >
          <banner.icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-bold text-sm">{banner.title}</p>
            <p className="text-xs opacity-90 mt-0.5">{banner.body}</p>
          </div>
        </div>
      )}

      {isInvalid ? (
        <div className="w-full flex flex-col items-center gap-3">
          <div className="bg-muted/50 border border-border rounded-2xl w-[312px] h-[312px] flex flex-col items-center justify-center gap-3 text-center px-6">
            {liveStatus === "used" ? (
              <CheckCircle2 className="w-16 h-16 text-primary" />
            ) : (
              <AlertTriangle className="w-16 h-16 text-destructive" />
            )}
            <p className="text-sm font-semibold text-foreground">
              {liveStatus === "used" ? "Already checked in" : "QR no longer valid"}
            </p>
            <p className="text-xs text-muted-foreground">
              {liveStatus === "used"
                ? "Need to step out and come back? Request re-entry below."
                : "Contact the event organizer for help."}
            </p>
          </div>
          {liveStatus === "used" && (
            <ReentryRequestButton
              ticket={ticket}
              onRequested={(entry) => {
                setHistory((prev) => [entry, ...prev]);
                setJustChanged(true);
              }}
            />
          )}
        </div>
      ) : (
        <RotatingQR token={ticket.qr_code_token} ticketId={ticket.id} />
      )}

      {!banner && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          Waiting for scanner…
        </div>
      )}

      {/* Activity history */}
      <div className="w-full">
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            Activity
          </p>
        </div>
        <ul className="rounded-xl border border-border bg-muted/30 divide-y divide-border max-h-44 overflow-y-auto">
          {history.slice(0, 5).map((h, i) => {
            const Icon = statusIcon(h.status);
            const tone = statusTone(h.status);
            return (
              <li
                key={h.id}
                className={`flex items-start gap-2.5 px-3 py-2 ${
                  i === 0 && justChanged ? "animate-in fade-in slide-in-from-top-1 duration-300" : ""
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tone}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{h.label}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {format(new Date(h.at), "MMM d · h:mm:ss a")}
                    {h.source && <span className="opacity-70">· {h.source}</span>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="text-center">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ticket ID</p>
        <p className="font-mono text-xs text-foreground mt-1 break-all">
          {ticket.qr_code_token}
        </p>
      </div>
      <div className="flex items-center gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={onViewDetails}>
          <Maximize2 className="w-4 h-4 mr-1.5" /> View details
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        Hold steady at the entrance scanner. Brightness up for best results.
      </p>
    </div>
  );
}


function RotatingQR({ token, ticketId }: { token: string; ticketId: string }) {
  const [tick, setTick] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);

  useEffect(() => {
    setTick(0);
    setSecondsLeft(REFRESH_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTick((n) => n + 1);
          return REFRESH_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [token]);

  // Wrap the static ticket token with a time-bound nonce so scanners that
  // validate freshness see a new payload every cycle, while servers that only
  // care about the underlying token still resolve correctly.
  const payload = useMemo(() => {
    const issuedAt = Math.floor(Date.now() / 1000);
    return JSON.stringify({
      v: 1,
      t: token,
      tid: ticketId,
      iat: issuedAt,
      exp: issuedAt + REFRESH_SECONDS,
      n: tick,
    });
  }, [token, ticketId, tick]);

  const progress = secondsLeft / REFRESH_SECONDS;
  const circumference = 2 * Math.PI * 18;

  return (
    <div className="relative bg-brand-gradient p-[3px] rounded-[20px] brand-glow">
      <div className="bg-white p-5 rounded-2xl">
        <QRCodeSVG value={payload} size={272} level="H" includeMargin={false} />
      </div>
      <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center shadow-lg">
        <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" className="fill-none stroke-muted" strokeWidth="3" />
          <circle
            cx="22"
            cy="22"
            r="18"
            className="fill-none stroke-primary transition-all duration-1000 ease-linear"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <span className="text-[11px] font-bold text-foreground tabular-nums">{secondsLeft}s</span>
      </div>
    </div>
  );
}

function ReentryRequestButton({
  ticket,
  onRequested,
}: {
  ticket: TicketRow;
  onRequested: (entry: {
    id: string;
    status: "purchased";
    label: string;
    at: string;
    source?: string;
  }) => void;
}) {
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requestedAt, setRequestedAt] = useState<string | null>(null);

  const handleRequest = async () => {
    if (requesting || requestedAt) return;
    setRequesting(true);
    const at = new Date().toISOString();

    // Best-effort notify the event organizer. Don't block UX on failure.
    try {
      const eventId = ticket.events?.id;
      const eventTitle = ticket.events?.title || "your event";
      if (eventId) {
        // Fetch organizer + guest profile in parallel
        const [{ data: ev }, { data: guestProfile }] = await Promise.all([
          (supabase as any)
            .from("events")
            .select("creator_id, slug")
            .eq("id", eventId)
            .maybeSingle(),
          user?.id
            ? (supabase as any)
                .from("profiles")
                .select("display_name, username")
                .eq("user_id", user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        const organizerId = ev?.creator_id;
        const guestName =
          guestProfile?.display_name ||
          guestProfile?.username ||
          user?.email?.split("@")[0] ||
          "A guest";
        const eventPath = ev?.slug ? `/event/${ev.slug}` : `/event/${eventId}`;
        const ticketPath = `/tickets/${ticket.id}`;
        const shortToken = ticket.qr_code_token.slice(0, 8);

        if (organizerId) {
          const { data: inserted } = await (supabase as any)
            .from("notifications")
            .insert({
              user_id: organizerId,
              type: "ticket_reentry_request",
              title: `🔁 ${guestName} needs re-entry`,
              message: `${guestName} is requesting re-entry to "${eventTitle}" · Ticket #${shortToken}. Tap to view.`,
              actor_id: user?.id ?? null,
              reference_id: ticket.id,
              // Deep-link straight to the staff review screen, focused on this request
              link: `/staff/reentry-requests?ticket=${ticket.id}`,
              metadata: {
                guest_name: guestName,
                guest_user_id: user?.id ?? null,
                event_id: eventId,
                event_title: eventTitle,
                event_url: eventPath,
                ticket_id: ticket.id,
                ticket_url: ticketPath,
                ticket_token: ticket.qr_code_token,
                requested_at: at,
              },
            })
            .select("id")
            .maybeSingle();

          // Patch the link with the notification id so staff can focus it
          if (inserted?.id) {
            await (supabase as any)
              .from("notifications")
              .update({ link: `/staff/reentry-requests?request=${inserted.id}&ticket=${ticket.id}` })
              .eq("id", inserted.id);
          }
        }
      }
    } catch {
      // Silent — guest still sees confirmation and staff guidance.
    }

    setRequestedAt(at);
    setRequesting(false);
    if (navigator.vibrate) navigator.vibrate(60);
    toast.success("Re-entry requested", {
      description: "We've notified the organizer. Show this screen to staff.",
    });
    onRequested({
      id: `reentry-${Date.now()}`,
      status: "purchased",
      label: "Re-entry requested",
      at,
      source: "Guest",
    });
  };

  if (requestedAt) {
    return (
      <div className="w-full max-w-[312px] flex flex-col gap-2">
        <div className="flex items-start gap-2 p-3 rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <BellRing className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold">Organizer notified</p>
            <p className="text-[11px] opacity-90 mt-0.5">
              Sent {format(new Date(requestedAt), "h:mm:ss a")} · Show this to staff at the door.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const subject = encodeURIComponent(`Re-entry help: ${ticket.events?.title || "event"}`);
            const body = encodeURIComponent(
              `Hi, I need re-entry assistance for ticket ${ticket.qr_code_token}.`
            );
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
          }}
        >
          <HelpCircle className="w-4 h-4 mr-1.5" />
          Contact support
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleRequest}
      disabled={requesting}
      className="w-full max-w-[312px]"
      size="lg"
    >
      {requesting ? (
        <>
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          Notifying organizer…
        </>
      ) : (
        <>
          <BellRing className="w-4 h-4 mr-1.5" />
          Request re-entry
        </>
      )}
    </Button>
  );
}
