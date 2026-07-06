import { useAttendance } from "@/hooks/useAttendance";
import { addDays, format, isToday } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const EMOJIS: Record<string, string> = {
  going: "😘",
  maybe: "🤔",
};

export default function GoingOutWeekCard() {
  const { user } = useAuth();
  const { myAttendance, markAttending, clearAttendance, isLoading } = useAttendance();
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const getStatus = (date: Date): "going" | "maybe" | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    // Only look at general attendance (no event_id) for this card
    const att = myAttendance.find(
      (a: any) => a.attend_date === dateStr && !a.event_id
    );
    return att?.status as "going" | "maybe" | undefined;
  };

  const toggleStatus = async (date: Date) => {
    if (!user) {
      toast.error("Sign in to save your plans");
      return;
    }
    const dateStr = format(date, "yyyy-MM-dd");
    const current = getStatus(date);
    const label = format(date, "EEE, MMM d");
    if (current === undefined) {
      await markAttending({ date: dateStr, status: "maybe" });
      toast.success(`Saved: maybe going out ${label}`, { description: "See it on your Discover feed under My plans." });
    } else if (current === "maybe") {
      await markAttending({ date: dateStr, status: "going" });
      toast.success(`Confirmed: going out ${label} 🎉`);
    } else {
      await clearAttendance({ date: dateStr });
      toast(`Cleared ${label}`);
    }
  };

  const summaries = days
    .map((d) => {
      const s = getStatus(d);
      if (!s) return null;
      const label = format(d, "EEE");
      return `${label}: ${s === "going" ? "going out" : "might go out"}`;
    })
    .filter(Boolean);

  return (
    <div
      className="mx-4 my-3"
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "hsl(var(--foreground))",
          marginBottom: 12,
        }}
      >
        Going out this week?
      </h3>

      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide"
        style={{ paddingBottom: 4 }}
      >
        {days.map((date) => {
          const status = getStatus(date);
          const dayLabel = isToday(date) ? "TODAY" : format(date, "EEE").toUpperCase();
          const dateNum = format(date, "d");

          const isGoing = status === "going";
          const isMaybe = status === "maybe";

          // Default: no status = plain white number, no highlight
          let bg = "hsl(var(--muted) / 0.5)";
          let borderColor = "hsl(var(--border))";
          let numColor = "hsl(var(--muted-foreground))";

          if (isGoing) {
            bg = "rgba(61, 124, 255,0.08)";
            borderColor = "rgba(61, 124, 255,0.4)";
            numColor = "#3D7CFF";
          } else if (isMaybe) {
            bg = "rgba(255,200,0,0.06)";
            borderColor = "rgba(255,200,0,0.4)";
            numColor = "#FFD700";
          }

          return (
            <button
              key={date.toISOString()}
              onClick={() => toggleStatus(date)}
              className="flex flex-col items-center justify-center gap-0.5 flex-shrink-0 transition-transform active:scale-95"
              style={{
                minWidth: 48,
                height: 64,
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                background: bg,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                {dayLabel}
              </span>
              <span
                style={{
                  fontSize: status ? 16 : 18,
                  fontWeight: status ? 400 : 800,
                  color: numColor,
                  lineHeight: 1,
                }}
              >
                {status ? EMOJIS[status] : dateNum}
              </span>
            </button>
          );
        })}
      </div>

      {summaries.length > 0 && (
        <p
          style={{
            fontSize: 11,
            color: "hsl(var(--muted-foreground))",
            marginTop: 8,
          }}
        >
          {summaries.join(" · ")}
        </p>
      )}
    </div>
  );
}
