import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Ticket, X } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { useAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlanRow {
  id: string;
  attend_date: string;
  status: string;
  event_id?: string | null;
  global_event_id?: string | null;
  event_title?: string | null;
  event_date?: string | null;
}

interface EventMeta {
  id: string;
  title: string;
  starts_at: string;
  location_name?: string | null;
  location_city?: string | null;
  slug?: string | null;
}

export default function MyPlansCard() {
  const { user } = useAuth();
  const { myAttendance, clearAttendance, removeAttendance, removeGlobalAttendance } = useAttendance();
  const [eventMap, setEventMap] = useState<Record<string, EventMeta>>({});

  const today = new Date().toISOString().split("T")[0];
  const upcoming: PlanRow[] = (myAttendance as PlanRow[])
    .filter((a) => a.attend_date >= today)
    .sort((a, b) => a.attend_date.localeCompare(b.attend_date));

  const eventIds = Array.from(new Set(upcoming.map((p) => p.event_id).filter(Boolean) as string[]));

  useEffect(() => {
    if (!eventIds.length) return;
    const missing = eventIds.filter((id) => !eventMap[id]);
    if (!missing.length) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("events")
        .select("id, title, starts_at, location_name, location_city, slug")
        .in("id", missing);
      if (data) {
        setEventMap((prev) => {
          const next = { ...prev };
          for (const e of data) next[e.id] = e;
          return next;
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventIds.join(",")]);

  if (!user) return null;
  if (upcoming.length === 0) return null;

  const handleRemove = async (p: PlanRow) => {
    try {
      if (p.event_id) {
        await removeAttendance(p.event_id);
      } else if (p.global_event_id) {
        await removeGlobalAttendance(p.global_event_id);
      } else {
        await clearAttendance({ date: p.attend_date });
      }
      toast.success("Removed from your plans");
    } catch {
      toast.error("Couldn't remove — try again");
    }
  };

  return (
    <div
      className="mx-4 my-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
          My plans ({upcoming.length})
        </h3>
        <Link to="/social/friends" style={{ fontSize: 12, color: "#3D7CFF" }}>See all</Link>
      </div>

      <div className="space-y-2">
        {upcoming.slice(0, 6).map((p) => {
          const ev = p.event_id ? eventMap[p.event_id] : undefined;
          const title = ev?.title || p.event_title || (p.status === "going" ? "Going out" : "Maybe going out");
          const dateStr = ev?.starts_at
            ? format(parseISO(ev.starts_at), "EEE, MMM d · h:mm a")
            : p.event_date
              ? format(parseISO(p.event_date), "EEE, MMM d")
              : format(parseISO(p.attend_date), "EEE, MMM d");
          const loc = ev ? [ev.location_name, ev.location_city].filter(Boolean).join(" · ") : null;
          const linkTo = ev ? `/events/${ev.slug || ev.id}` : null;

          const Inner = (
            <div
              className="flex items-center gap-3 rounded-xl p-3 transition-colors"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="flex flex-col items-center justify-center flex-shrink-0"
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: p.status === "going" ? "rgba(61, 124, 255,0.12)" : "rgba(255,200,0,0.08)",
                  border: `1px solid ${p.status === "going" ? "rgba(61, 124, 255,0.4)" : "rgba(255,200,0,0.4)"}`,
                }}
              >
                {ev || p.global_event_id ? (
                  <Ticket className="w-4 h-4" style={{ color: p.status === "going" ? "#3D7CFF" : "#FFD700" }} />
                ) : (
                  <Calendar className="w-4 h-4" style={{ color: p.status === "going" ? "#3D7CFF" : "#FFD700" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: "#fff" }}>{title}</p>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: p.status === "going" ? "rgba(61, 124, 255,0.12)" : "rgba(255,200,0,0.12)",
                      color: p.status === "going" ? "#3D7CFF" : "#FFD700",
                    }}
                  >
                    {p.status === "going" ? "Going" : "Maybe"}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{dateStr}</p>
                {loc && (
                  <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <MapPin className="w-3 h-3" />{loc}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(p); }}
                className="flex-shrink-0 rounded-md flex items-center justify-center transition-colors"
                style={{
                  width: 32, height: 32,
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.5)",
                }}
                aria-label="Remove from plans"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );

          return linkTo ? (
            <Link key={p.id} to={linkTo} className="block">{Inner}</Link>
          ) : (
            <div key={p.id}>{Inner}</div>
          );
        })}
      </div>
    </div>
  );
}
