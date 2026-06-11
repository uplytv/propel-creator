import { useState, useEffect } from "react";
import { MapPin, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveEventBannerProps {
  eventId: string;
  streamId: string;
}

export default function LiveEventBanner({ eventId, streamId }: LiveEventBannerProps) {
  const [event, setEvent] = useState<any>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [soldCount, setSoldCount] = useState(0);
  const [animateCount, setAnimateCount] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, location_name, location_city, ticket_price, ticket_quantity, tickets_sold, is_free")
        .eq("id", eventId)
        .single();
      if (data) {
        setEvent(data);
        setSoldCount(data.tickets_sold || 0);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Subscribe to venue_attendance_count updates via Realtime
  useEffect(() => {
    const fetchAttendance = async () => {
      const { data } = await (supabase as any)
        .from("mux_live_streams")
        .select("venue_attendance_count")
        .eq("id", streamId)
        .single();
      if (data) setAttendanceCount(data.venue_attendance_count || 0);
    };
    fetchAttendance();

    const channel = supabase
      .channel(`event-stream-${streamId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mux_live_streams", filter: `id=eq.${streamId}` },
        (payload: any) => {
          const newCount = payload.new.venue_attendance_count;
          if (newCount !== undefined && newCount !== attendanceCount) {
            setAttendanceCount(newCount);
            setAnimateCount(true);
            setTimeout(() => setAnimateCount(false), 1000);
          }
        }
      )
      .subscribe();

    // Also subscribe to ticket sales
    const ticketChannel = supabase
      .channel(`event-tickets-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` },
        () => {
          setSoldCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(ticketChannel);
    };
  }, [streamId, eventId]);

  if (!event) return null;

  const remaining = event.ticket_quantity ? event.ticket_quantity - soldCount : null;
  const isUrgent = remaining !== null && remaining < 20 && remaining > 0;
  const isSoldOut = remaining !== null && remaining <= 0;

  return (
    <div
      className="mx-4 mb-3 rounded-xl p-3.5"
      style={{
        background: "rgba(61, 124, 255,0.06)",
        border: "1px solid rgba(61, 124, 255,0.2)",
      }}
    >
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            Tonight · {event.location_name || "Virtual"}{event.location_city ? ` · ${event.location_city}` : ""}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            {attendanceCount > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: "#3D7CFF",
                    animation: animateCount ? "countPulse 1s ease-in-out" : undefined,
                  }}
                />
                <span style={{ color: "#3D7CFF" }} className="font-semibold">{attendanceCount}</span>
                <span className="text-white">people there right now</span>
              </span>
            )}
            {remaining !== null && !isSoldOut && (
              <span className="flex items-center gap-1 text-xs">
                <Ticket className="w-3 h-3 text-muted-foreground" />
                <span className={isUrgent ? "text-destructive font-bold" : "text-white"}>
                  {isUrgent ? `Only ${remaining} left!` : `${remaining} tickets left`}
                </span>
                {!event.is_free && <span className="text-muted-foreground">· ${event.ticket_price} each</span>}
              </span>
            )}
            {isSoldOut && (
              <span className="text-xs font-bold text-destructive">SOLD OUT</span>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes countPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
