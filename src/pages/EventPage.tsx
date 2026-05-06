import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays, MapPin, Monitor, Globe, Users, Ticket, Bell,
  Download, Check, Clock, Loader2, Share2, ExternalLink, Plus, Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import EventLiveNowBanner from "@/components/live/EventLiveNowBanner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import SEOHead from "@/components/SEOHead";
import BackNav from "@/components/BackNav";
import AppLayout from "@/components/layout/AppLayout";
import EventTabs from "@/components/social/EventTabs";
import { PurchaseOverlay } from "@/components/payments/PurchaseOverlay";
import SeatPicker from "@/components/events/SeatPicker";
import ResaleListings from "@/components/events/ResaleListings";
import { useAuth } from "@/context/AuthContext";
import { useEvent, useMyTicketForEvent, useClaimFreeTicket, useSetEventReminder } from "@/hooks/useEvents";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow, isBefore, differenceInMinutes } from "date-fns";
import { useQuery } from "@tanstack/react-query";

const typeBadge: Record<string, { emoji: string; color: string; label: string }> = {
  virtual: { emoji: "🖥️", color: "bg-blue-500/20 text-blue-500", label: "Virtual" },
  in_person: { emoji: "📍", color: "bg-warning/20 text-warning", label: "In Person" },
  hybrid: { emoji: "🌐", color: "bg-violet-500/20 text-violet-500", label: "Hybrid" },
};

function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const target = new Date(date);
  if (isBefore(target, now)) return <span className="text-primary">Starting now!</span>;
  return <span>{formatDistanceToNow(target, { addSuffix: true })}</span>;
}

export default function EventPage() {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(slug);
  const { data: myTicket } = useMyTicketForEvent(event?.id);
  const claimFree = useClaimFreeTicket();
  const setReminder = useSetEventReminder();
  const [quantity, setQuantity] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [seatPickerOpen, setSeatPickerOpen] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const isSeated = (event as any)?.ticketing_mode === "seated";
  const seatMap = (event as any)?.seat_map as { rows?: number; cols?: number } | null;

  // Get creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ["event-creator", event?.creator_id],
    enabled: !!event,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, username, avatar_url").eq("user_id", event!.creator_id).maybeSingle();
      return data;
    },
  });

  // Get attendee count & avatars
  const { data: attendees } = useQuery({
    queryKey: ["event-attendees", event?.id],
    enabled: !!event,
    queryFn: async () => {
      const { data } = await (supabase as any).from("tickets").select("buyer_id").eq("event_id", event!.id).eq("status", "active").limit(5);
      return data || [];
    },
  });

  const badge = event ? typeBadge[event.event_type] || typeBadge.virtual : null;
  const isPast = event ? isBefore(new Date(event.ends_at), new Date()) : false;
  const virtualRevealed = event?.virtual_link_unlocked_at || (event && differenceInMinutes(new Date(event.starts_at), new Date()) <= 30);
  const isHost = !!(event && user && event.creator_id === user.id);
  const isFree = !!event && (event.is_free || Number(event.ticket_price || 0) === 0);

  async function handleGetTicket() {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!event) return;

    if (isHost) {
      toast.success("You're the host of this event 🎤");
      return;
    }

    if (isFree) {
      await claimFree.mutateAsync(event);
      return;
    }

    if (isSeated && seatMap?.rows && seatMap?.cols) {
      setSeatPickerOpen(true);
      return;
    }

    setCheckoutOpen(true);
  }

  function handleDownloadIcs() {
    if (!event) return;
    const start = new Date(event.starts_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(event.ends_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
LOCATION:${event.location_name || "Virtual"}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Show success state (reactive to client navigation)
  const showSuccess = searchParams.get("ticket") === "success";

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Skeleton className="aspect-video w-full rounded-xl mb-6" />
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Event not found</div>
      </AppLayout>
    );
  }

  if (showSuccess) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">You're going! 🎉</h1>
          <p className="text-muted-foreground mb-6">{event.title} · {format(new Date(event.starts_at), "EEE MMM d · h:mm a")}</p>
          <div className="flex gap-3">
            <Button onClick={handleDownloadIcs} variant="outline"><CalendarDays className="w-4 h-4 mr-2" /> Add to Calendar</Button>
            {myTicket && (
              <Button onClick={() => navigate(`/tickets/${myTicket.qr_code_token}`)}><Ticket className="w-4 h-4 mr-2" /> View Ticket</Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEOHead
        title={`${event.title} by ${creatorProfile?.display_name || "Creator"} | UPLY`}
        description={event.description?.slice(0, 160) || `Join ${event.title} on UPLY`}
        image={event.cover_image_url || undefined}
      />
      <div className="max-w-3xl mx-auto pb-32">
        {/* Cover */}
        <div className="relative aspect-video w-full overflow-hidden">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-card flex items-center justify-center">
              <CalendarDays className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          {/* Creator overlay */}
          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            {creatorProfile?.avatar_url && (
              <img src={creatorProfile.avatar_url} className="w-10 h-10 rounded-full border-2 border-primary" />
            )}
            <span className="text-sm font-medium text-foreground">{creatorProfile?.display_name}</span>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Live Now Banner */}
          <EventLiveNowBanner eventId={event.id} />

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {badge && (
              <Badge variant="outline" className={badge.color}>{badge.emoji} {badge.label}</Badge>
            )}
            {event.is_free && <Badge variant="outline" className="bg-primary/20 text-primary">FREE</Badge>}
            {isPast && <Badge variant="outline" className="bg-muted text-muted-foreground">Ended</Badge>}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{event.title}</h1>

          {/* Date */}
          <p className="text-primary font-medium flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {format(new Date(event.starts_at), "EEEE MMMM d · h:mm a")} {event.timezone?.split("/")[1]?.replace("_", " ")}
          </p>

          {/* Countdown */}
          {!isPast && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Starts <Countdown date={event.starts_at} />
            </p>
          )}

          {/* Location */}
          {event.location_name && (
            <p className="text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {event.location_name}{event.location_city ? `, ${event.location_city}` : ""}
            </p>
          )}

          {/* Description */}
          {event.description && (
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Attendees */}
          {event.tickets_sold > 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> {event.tickets_sold} {event.tickets_sold === 1 ? "person is" : "people are"} going
            </p>
          )}

          {/* Virtual link for ticket holders */}
          {myTicket && event.virtual_link && virtualRevealed && (
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-xl">
              <p className="text-sm font-medium text-foreground mb-2">🔗 Your access link is ready</p>
              <a href={event.virtual_link} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2"><ExternalLink className="w-4 h-4" /> Join Event</Button>
              </a>
            </div>
          )}
          {myTicket && event.virtual_link && !virtualRevealed && (
            <div className="p-4 bg-card border border-border rounded-xl">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Access link reveals 30 minutes before the event
              </p>
            </div>
          )}

          {/* Resale marketplace */}
          {!myTicket && (
            <ResaleListings
              eventId={event.id}
              eventTitle={event.title}
              faceValueCents={Math.round((event.ticket_price || 0) * 100)}
              resaleAllowed={(event as any).resale_allowed !== false}
              resaleCapPct={(event as any).resale_price_cap_pct ?? 120}
            />
          )}
        </div>

        {/* Event tabs: Chat / People / Gallery / Buy-Sell */}
        <EventTabs eventId={event.id} eventTitle={event.title} />

        {/* Bottom sticky ticket card */}
        {!isPast && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40 md:relative md:border-t-0 md:mt-6">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xl font-bold text-foreground">
                  {event.is_free ? <span className="text-primary">FREE</span> : `$${(event.ticket_price * quantity).toFixed(2)}`}
                </p>
                {event.ticket_quantity && event.ticket_quantity - event.tickets_sold <= 20 && !event.is_sold_out && (
                  <p className="text-xs text-destructive">{event.ticket_quantity - event.tickets_sold} tickets left</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!event.is_free && !myTicket && !event.is_sold_out && !isSeated && (
                  <div className="flex items-center border border-border rounded-lg overflow-hidden h-11">
                    <button aria-label="Decrease" className="w-11 h-11 flex items-center justify-center disabled:opacity-30" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}><Minus className="w-4 h-4" /></button>
                    <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                    <button aria-label="Increase" className="w-11 h-11 flex items-center justify-center disabled:opacity-30" onClick={() => setQuantity(q => Math.min(10, q + 1))} disabled={quantity >= 10}><Plus className="w-4 h-4" /></button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={handleDownloadIcs} aria-label="Add to calendar">
                  <CalendarDays className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => event && setReminder.mutate(event.id)} aria-label="Remind me">
                  <Bell className="w-4 h-4" />
                </Button>
                {isHost ? (
                  <Button variant="outline" onClick={() => navigate("/events")} className="gap-2">
                    <Ticket className="w-4 h-4" /> Manage Event
                  </Button>
                ) : myTicket ? (
                  <Button onClick={() => navigate(`/tickets/${myTicket.qr_code_token}`)} className="gap-2">
                    <Ticket className="w-4 h-4" /> {isFree ? "You're In ✓" : "Your Ticket"}
                  </Button>
                ) : event.is_sold_out ? (
                  <Button variant="outline" disabled>Sold Out</Button>
                ) : (
                  <Button onClick={handleGetTicket} disabled={claimFree.isPending} className="gap-2">
                    {claimFree.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                    {isFree ? "RSVP — Free" : isSeated ? "Pick Seats" : "Get Tickets"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {!event.is_free && (
          <PurchaseOverlay
            isOpen={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={() => navigate(`/tickets/success?event=${event.id}`)}
            purchaseType="ticket"
            purchaseParams={{
              event_id: event.id,
              quantity: isSeated ? selectedSeats.length : quantity,
              ...(isSeated && selectedSeats.length > 0 ? { seat_labels: selectedSeats } : {}),
            }}
            title={event.title}
            description={
              isSeated && selectedSeats.length
                ? `Seats ${selectedSeats.join(", ")}`
                : `${quantity} ticket${quantity > 1 ? "s" : ""}`
            }
            price={event.ticket_price * (isSeated ? selectedSeats.length : quantity)}
          />
        )}

        {isSeated && seatMap?.rows && seatMap?.cols && (
          <SeatPicker
            isOpen={seatPickerOpen}
            onClose={() => setSeatPickerOpen(false)}
            eventId={event.id}
            rows={seatMap.rows}
            cols={seatMap.cols}
            pricePerSeat={event.ticket_price}
            maxSeats={10}
            onConfirm={(seats) => {
              setSelectedSeats(seats);
              setSeatPickerOpen(false);
              setCheckoutOpen(true);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
