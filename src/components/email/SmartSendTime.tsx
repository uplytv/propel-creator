import { useMemo } from "react";
import { Clock, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SmartSendTimeProps {
  subscribers: Array<{ optimal_send_hour?: number | null; send_hour_data?: any }>;
  onSelectHour?: (hour: number) => void;
}

export default function SmartSendTime({ subscribers, onSelectHour }: SmartSendTimeProps) {
  const analysis = useMemo(() => {
    // Aggregate all subscribers' open-hour data
    const hourCounts: Record<number, number> = {};
    let subscribersWithData = 0;

    subscribers.forEach(sub => {
      const data = sub.send_hour_data;
      if (!data || typeof data !== "object" || Object.keys(data).length === 0) return;
      subscribersWithData++;
      Object.entries(data).forEach(([hour, count]) => {
        const h = parseInt(hour);
        if (!isNaN(h)) {
          hourCounts[h] = (hourCounts[h] || 0) + (count as number);
        }
      });
    });

    // Sort hours by engagement
    const sorted = Object.entries(hourCounts)
      .map(([h, c]) => ({ hour: parseInt(h), count: c }))
      .sort((a, b) => b.count - a.count);

    const bestHour = sorted[0]?.hour;
    const totalOpens = sorted.reduce((sum, s) => sum + s.count, 0);

    // Build hour distribution for visualization (24 hours)
    const distribution = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0,
      pct: totalOpens > 0 ? ((hourCounts[i] || 0) / totalOpens * 100) : 0,
    }));

    return { bestHour, sorted: sorted.slice(0, 3), subscribersWithData, distribution, totalOpens };
  }, [subscribers]);

  const formatHour = (h: number) => {
    if (h === 0) return "12 AM";
    if (h < 12) return `${h} AM`;
    if (h === 12) return "12 PM";
    return `${h - 12} PM`;
  };

  if (analysis.subscribersWithData < 5 || analysis.totalOpens < 10) {
    return (
      <div className="p-3 rounded-xl border border-border bg-card/50 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Smart Send Time</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Not enough data yet. Send more broadcasts to unlock AI-powered optimal send times based on when your subscribers open emails.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Smart Send Time</span>
        </div>
        <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary">
          <Users className="w-2.5 h-2.5 mr-0.5" />{analysis.subscribersWithData} tracked
        </Badge>
      </div>

      {/* Hour distribution bar chart */}
      <div className="flex items-end gap-px h-12">
        {analysis.distribution.map(({ hour, pct }) => (
          <div
            key={hour}
            className="flex-1 rounded-t-sm transition-colors cursor-pointer hover:opacity-80"
            style={{
              height: `${Math.max(2, pct * 2.5)}%`,
              background: hour === analysis.bestHour ? "#3D7CFF" : "hsl(var(--muted-foreground) / 0.2)",
            }}
            title={`${formatHour(hour)}: ${pct.toFixed(1)}%`}
            onClick={() => onSelectHour?.(hour)}
          />
        ))}
      </div>
      <div className="flex justify-between text-[8px] text-muted-foreground">
        <span>12AM</span>
        <span>6AM</span>
        <span>12PM</span>
        <span>6PM</span>
        <span>11PM</span>
      </div>

      {/* Top hours */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground">Best times to send</p>
        <div className="flex gap-1.5">
          {analysis.sorted.map(({ hour }, i) => (
            <Button
              key={hour}
              variant="outline"
              size="sm"
              className="h-7 text-[10px] rounded-lg gap-1"
              onClick={() => onSelectHour?.(hour)}
            >
              <Clock className="w-3 h-3" />
              {formatHour(hour)}
              {i === 0 && <span className="text-primary">★</span>}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
