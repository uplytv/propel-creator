import { useAttendance } from "@/hooks/useAttendance";
import { addDays, format, isToday } from "date-fns";

const EMOJIS: Record<string, string> = {
  going: "😘",
  maybe: "🤔",
};

export default function GoingOutWeekCard() {
  const { myAttendance, markAttending } = useAttendance();
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const getStatus = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const att = myAttendance.find((a: any) => a.attend_date === dateStr);
    return att?.status as "going" | "maybe" | undefined;
  };

  const toggleStatus = async (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const current = getStatus(date);
    const next = current === undefined ? "maybe" : current === "maybe" ? "going" : undefined;
    if (next) {
      await markAttending({ date: dateStr, status: next });
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
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: "#FFFFFF",
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

          let bg = "rgba(255,255,255,0.03)";
          let borderColor = "rgba(255,255,255,0.08)";
          let numColor = "rgba(255,255,255,0.6)";

          if (isGoing) {
            bg = "rgba(0,255,133,0.08)";
            borderColor = "rgba(0,255,133,0.4)";
            numColor = "#00FF85";
          } else if (isMaybe) {
            bg = "rgba(255,200,0,0.06)";
            borderColor = "rgba(255,200,0,0.4)";
            numColor = "#FFD700";
          }

          return (
            <button
              key={date.toISOString()}
              onClick={() => toggleStatus(date)}
              className="flex flex-col items-center justify-center gap-0.5 flex-shrink-0"
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
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                {dayLabel}
              </span>
              {status ? (
                <span style={{ fontSize: 16, lineHeight: 1 }}>{EMOJIS[status]}</span>
              ) : (
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: numColor,
                  }}
                >
                  {dateNum}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {summaries.length > 0 && (
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            marginTop: 8,
          }}
        >
          {summaries.join(" · ")}
        </p>
      )}
    </div>
  );
}
