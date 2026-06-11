import { Bell, BellOff, Sparkles } from "lucide-react";
import { useTrackDrop, useDropCountdown } from "../hooks/useTrackDrop";

interface Props {
  trackId: string;
}

export default function DropCountdownCard({ trackId }: Props) {
  const { drop, isReminded, reminderCount, setReminder } = useTrackDrop(trackId);
  const countdown = useDropCountdown(drop?.drop_at);

  if (!drop || !countdown || countdown.done) return null;

  return (
    <div
      className="rounded-2xl p-5 overflow-hidden relative"
      style={{ background: "linear-gradient(135deg, #3D7CFF 0%, #00E5FF 100%)" }}
    >
      <div className="flex items-center gap-2 text-black/80 text-xs font-black tracking-widest mb-2">
        <Sparkles className="w-4 h-4" /> DROPPING SOON
      </div>
      {drop.hype_message && (
        <p className="text-black font-bold text-base mb-3">{drop.hype_message}</p>
      )}

      <div className="grid grid-cols-4 gap-2 my-3">
        {[
          { l: "DAYS", v: countdown.days },
          { l: "HRS", v: countdown.hours },
          { l: "MIN", v: countdown.minutes },
          { l: "SEC", v: countdown.seconds },
        ].map((u) => (
          <div key={u.l} className="bg-black/15 rounded-lg p-2 text-center">
            <p className="text-black font-black text-2xl tabular-nums">{String(u.v).padStart(2, "0")}</p>
            <p className="text-black/70 text-[10px] font-bold tracking-wider">{u.l}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-black/80 text-xs font-bold">
          {reminderCount.toLocaleString()} {reminderCount === 1 ? "fan" : "fans"} reminded
        </span>
        <button
          onClick={() => setReminder.mutate(!isReminded)}
          className={`rounded-lg px-4 font-bold text-sm flex items-center gap-2 ${
            isReminded ? "bg-black/20 text-black" : "bg-black text-[#3D7CFF]"
          }`}
          style={{ minHeight: 44 }}
        >
          {isReminded ? <><BellOff className="w-4 h-4" /> Reminded</> : <><Bell className="w-4 h-4" /> Remind me</>}
        </button>
      </div>
    </div>
  );
}
