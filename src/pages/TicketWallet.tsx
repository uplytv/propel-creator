import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, isBefore, isAfter } from "date-fns";
import { Ticket, CalendarDays, MapPin, ChevronRight, QrCode, Search, X, Maximize2 } from "lucide-react";
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
        .select("id, qr_code_token, status, amount_paid, created_at, events:event_id(id,title,starts_at,ends_at,cover_image_url,location_name,event_type)")
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
          <Button onClick={() => navigate("/auth")}>Sign in</Button>
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
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">My Tickets</h1>
            <p className="text-sm text-muted-foreground mt-0.5">All your passes in one wallet</p>
          </div>
          <Ticket className="w-7 h-7 text-primary" />
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
            <div className="flex flex-col items-center p-6 gap-4">
              <div className="w-full flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Check-in pass</p>
                  <h2 className="text-lg font-bold text-foreground truncate">
                    {qrTicket.events?.title || "Event"}
                  </h2>
                  {qrTicket.events && (
                    <p className="text-xs text-primary mt-0.5">
                      {format(new Date(qrTicket.events.starts_at), "EEE MMM d · h:mm a")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setQrTicket(null)}
                  className="p-2 rounded-full hover:bg-muted transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>
              <RotatingQR token={qrTicket.qr_code_token} ticketId={qrTicket.id} />
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ticket ID</p>
                <p className="font-mono text-xs text-foreground mt-1 break-all">
                  {qrTicket.qr_code_token}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const t = qrTicket;
                    setQrTicket(null);
                    navigate(`/tickets/${t.qr_code_token}`);
                  }}
                >
                  <Maximize2 className="w-4 h-4 mr-1.5" /> View details
                </Button>
                <Button className="flex-1" onClick={() => setQrTicket(null)}>
                  Done
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Hold steady at the entrance scanner. Brightness up for best results.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
