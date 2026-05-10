import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, Send } from "lucide-react";
import { usePremiere, useTogglePremiereReminder, usePremiereChat } from "../hooks/usePremieres";
import { useAuth } from "@/context/AuthContext";

function useCountdown(target?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return "";
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (diff <= 0) return "Live now";
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PremierePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: premiere } = usePremiere(id);
  const { reminded, toggle, isPending } = useTogglePremiereReminder(id);
  const { messages, send } = usePremiereChat(id);
  const [draft, setDraft] = useState("");
  const countdown = useCountdown(premiere?.scheduled_at);

  if (!premiere) return <div className="p-8 text-white/60">Loading premiere…</div>;

  const isLive = countdown === "Live now";

  return (
    <div className="pb-40 flex flex-col min-h-[100dvh]">
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link to="/music/live" className="p-2 rounded-full bg-white/5 text-white" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-white">Premiere</h1>
      </header>

      <div className="px-4 text-center">
        {isLive && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </span>
        )}
        <div className="mt-3 text-5xl font-black text-white tabular-nums">{countdown}</div>
        <div className="mt-2 text-sm text-white/60">
          {new Date(premiere.scheduled_at).toLocaleString()}
        </div>
        <Link
          to={`/music/track/${premiere.track_id}`}
          className="inline-block mt-3 text-xs text-white/70 underline"
        >
          View track
        </Link>

        {user && (
          <button
            onClick={() => toggle()}
            disabled={isPending}
            className="mt-5 w-full py-3 rounded-full text-white font-bold flex items-center justify-center gap-2"
            style={{
              background: reminded
                ? "rgba(255,255,255,0.08)"
                : "linear-gradient(90deg,#3D7CFF,#B025FF)",
            }}
          >
            {reminded ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            {reminded ? "Reminder set" : "Remind me"}
          </button>
        )}
      </div>

      <div className="mt-8 flex-1 px-4 flex flex-col">
        <h3 className="text-sm font-bold text-white/80 mb-2">Live chat</h3>
        <div className="flex-1 overflow-y-auto space-y-2 mb-2 max-h-[40vh]">
          {messages.map((m) => (
            <div key={m.id} className="text-sm text-white/80 bg-white/[0.03] rounded-lg px-3 py-2">
              {m.message}
            </div>
          ))}
          {!messages.length && <p className="text-xs text-white/40">No messages yet.</p>}
        </div>
        {user && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              send(draft.trim());
              setDraft("");
            }}
            className="flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Say something…"
              className="flex-1 px-3 py-2 rounded-full bg-white/5 text-white text-base"
            />
            <button
              type="submit"
              className="p-2 rounded-full text-white"
              style={{ background: "linear-gradient(90deg,#3D7CFF,#B025FF)" }}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
