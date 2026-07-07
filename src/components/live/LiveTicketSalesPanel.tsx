import { useState, useEffect } from "react";
import { Ticket, TrendingUp, Users, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LiveTicketSalesPanelProps {
  streamId: string;
  eventId: string;
  viewerCount: number;
}

export default function LiveTicketSalesPanel({ streamId, eventId, viewerCount }: LiveTicketSalesPanelProps) {
  const [event, setEvent] = useState<any>(null);
  const [soldDuringStream, setSoldDuringStream] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [editingAttendance, setEditingAttendance] = useState(false);
  const [attendanceInput, setAttendanceInput] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const [{ data: evt }, { data: stream }] = await Promise.all([
        supabase.from("events").select("id, title, ticket_price, ticket_quantity, tickets_sold, is_free").eq("id", eventId).single(),
        supabase.from("mux_live_streams").select("tickets_sold_during_stream, venue_attendance_count").eq("id", streamId).single(),
      ]);
      if (evt) setEvent(evt);
      if (stream) {
        setSoldDuringStream(stream.tickets_sold_during_stream || 0);
        setAttendanceCount(stream.venue_attendance_count || 0);
        setAttendanceInput(String(stream.venue_attendance_count || 0));
      }
    };
    fetch();

    // Realtime ticket updates
    const channel = supabase
      .channel(`sales-panel-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` }, () => {
        setSoldDuringStream((c) => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId, eventId]);

  const handleUpdateAttendance = async () => {
    const val = parseInt(attendanceInput) || 0;
    setAttendanceCount(val);
    setEditingAttendance(false);
    try {
      await supabase
        .from("mux_live_streams")
        .update({ venue_attendance_count: val })
        .eq("id", streamId);
    } catch {
      toast.error("Failed to update attendance");
    }
  };

  if (!event) return null;

  const totalSold = (event.tickets_sold || 0);
  const remaining = event.ticket_quantity ? event.ticket_quantity - totalSold : null;
  const revenue = soldDuringStream * (event.ticket_price || 0);
  const conversion = viewerCount > 0 ? ((soldDuringStream / viewerCount) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl p-3 space-y-3 bg-background/95 backdrop-blur-md border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Live Ticket Sales</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-primary">{soldDuringStream}</p>
          <p className="text-[10px] text-muted-foreground">Sold this stream</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-foreground">${revenue.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">Revenue</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-foreground">{remaining !== null ? remaining : "∞"}</p>
          <p className="text-[10px] text-muted-foreground">Remaining</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-foreground">{conversion}%</p>
          <p className="text-[10px] text-muted-foreground">Conversion</p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Attendance</p>
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          {editingAttendance ? (
            <Input
              type="number"
              value={attendanceInput}
              onChange={(e) => setAttendanceInput(e.target.value)}
              onBlur={handleUpdateAttendance}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateAttendance()}
              autoFocus
              className="h-7 w-20 text-sm"
            />
          ) : (
            <button
              onClick={() => { setEditingAttendance(true); setAttendanceInput(String(attendanceCount)); }}
              className="text-sm font-bold text-foreground hover:text-primary transition-colors"
            >
              {attendanceCount} <span className="text-[10px] text-muted-foreground font-normal">← tap to update</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Eye className="w-3 h-3" />
        <span>Watching stream: {viewerCount}</span>
      </div>
    </div>
  );
}
