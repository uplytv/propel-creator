import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Sparkles } from "lucide-react";
import type { Premiere } from "../hooks/usePremieres";

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (diff <= 0) return "Live now";
  if (d > 0) return `${d}d ${h}h`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PremiereCard({ premiere }: { premiere: Premiere }) {
  const countdown = useCountdown(premiere.scheduled_at);
  const isLive = premiere.status === "live" || new Date(premiere.scheduled_at).getTime() <= Date.now();
  return (
    <Link
      to={`/music/premiere/${premiere.id}`}
      className="shrink-0 w-56 rounded-xl p-3 bg-gradient-to-br from-fuchsia-600/30 to-blue-600/20 border border-white/10 active:scale-[0.98] transition"
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300">
        <Sparkles className="w-3 h-3" /> Premiere
      </div>
      <div className="mt-3 text-2xl font-black text-white tabular-nums">{countdown}</div>
      <div className="mt-1 text-xs text-white/60 flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {new Date(premiere.scheduled_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
      </div>
      <div className="mt-2 text-[11px] text-white/50">{premiere.reminders_count} reminders set</div>
      {isLive && (
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
          LIVE NOW
        </span>
      )}
    </Link>
  );
}
