import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface EventCountdownProps {
  startsAt: string;
  compact?: boolean;
}

export default function EventCountdown({ startsAt, compact }: EventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const target = new Date(startsAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsLive(true);
        setTimeLeft("LIVE NOW");
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else {
        setTimeLeft(`${mins}m ${secs}s`);
      }
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [startsAt]);

  if (compact) {
    return (
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{
          background: isLive ? "rgba(255,59,48,0.2)" : "rgba(255,255,255,0.1)",
          color: isLive ? "#FF3B30" : "rgba(255,255,255,0.7)",
        }}
      >
        {isLive ? "🔴 LIVE" : `⏱ ${timeLeft}`}
      </span>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: isLive ? "rgba(255,59,48,0.1)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${isLive ? "rgba(255,59,48,0.2)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <Clock className="w-4 h-4" style={{ color: isLive ? "#FF3B30" : "#3D7CFF" }} />
      <span className="text-sm font-bold" style={{ color: isLive ? "#FF3B30" : "#3D7CFF" }}>
        {timeLeft}
      </span>
    </div>
  );
}
