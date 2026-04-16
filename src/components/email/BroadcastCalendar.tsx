import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Broadcast {
  id: string;
  subject: string;
  status: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
  total_recipients?: number;
}

export default function BroadcastCalendar({ broadcasts }: { broadcasts: Broadcast[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const broadcastsByDay = useMemo(() => {
    const map: Record<string, Broadcast[]> = {};
    broadcasts.forEach(b => {
      const date = b.scheduled_at || b.sent_at || b.created_at;
      if (!date) return;
      const key = format(new Date(date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [broadcasts]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const startPad = monthStart.getDay();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {dayNames.map(d => (
          <div key={d} className="text-[10px] text-center text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="h-16" />
        ))}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayBroadcasts = broadcastsByDay[key] || [];
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={`h-16 rounded-lg border p-1 overflow-hidden ${
                isToday ? "border-primary/50 bg-primary/5" : "border-border/30"
              } ${dayBroadcasts.length > 0 ? "bg-card" : ""}`}
            >
              <div className={`text-[10px] ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
              {dayBroadcasts.slice(0, 2).map(b => (
                <div
                  key={b.id}
                  className={`text-[8px] truncate rounded px-0.5 mt-0.5 ${
                    b.status === "scheduled" ? "bg-blue-500/15 text-blue-400" :
                    b.status === "sent" ? "bg-primary/10 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}
                  title={b.subject}
                >
                  <Mail className="w-2 h-2 inline mr-0.5" />
                  {b.subject.slice(0, 12)}
                </div>
              ))}
              {dayBroadcasts.length > 2 && (
                <div className="text-[7px] text-muted-foreground mt-0.5">+{dayBroadcasts.length - 2} more</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upcoming list */}
      {broadcasts.filter(b => b.status === "scheduled").length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
          {broadcasts
            .filter(b => b.status === "scheduled" && b.scheduled_at)
            .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
            .slice(0, 5)
            .map(b => (
              <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                <Badge className="bg-blue-500/10 text-blue-400 text-[9px]">Scheduled</Badge>
                <span className="text-foreground truncate flex-1">{b.subject}</span>
                <span className="text-muted-foreground text-[10px] shrink-0">
                  {format(new Date(b.scheduled_at!), "MMM d, h:mm a")}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
