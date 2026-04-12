import { useAttendance } from "@/hooks/useAttendance";
import { addDays, format, isToday } from "date-fns";

const EMOJIS: Record<string, string> = {
  going: "🥳",
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

  const hasSelections = days.some((d) => getStatus(d));

  return (
    <div
      className="mx-4 my-3 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #E8956A 0%, #D4687B 50%, #C084FC 100%)",
        padding: 1,
      }}
    >
      <div
        className="rounded-2xl p-4"
        style={{
          background: "linear-gradient(135deg, rgba(232,149,106,0.95) 0%, rgba(212,104,123,0.95) 50%, rgba(192,132,252,0.9) 100%)",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-white">Going out this week?</h3>
          <button
            className="text-white/60 text-xl leading-none"
            style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ×
          </button>
        </div>
        <p className="text-sm text-white/70 mb-4">Choose which days</p>

        <div className="flex items-center justify-center gap-2 mb-4">
          {days.slice(0, 5).map((date) => {
            const status = getStatus(date);
            const dayLabel = isToday(date) ? "today" : format(date, "EEE").toLowerCase();
            const isSelected = !!status;

            return (
              <button
                key={date.toISOString()}
                onClick={() => toggleStatus(date)}
                className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all"
                style={{
                  backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : "transparent",
                  minWidth: 52,
                }}
              >
                {status && <span className="text-xl mb-0.5">{EMOJIS[status]}</span>}
                <span
                  className="text-sm font-bold"
                  style={{ color: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.45)" }}
                >
                  {dayLabel}
                </span>
                <span
                  className="text-xs"
                  style={{ color: isSelected ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }}
                >
                  {format(date, "d")}
                </span>
                {status && (
                  <span className="text-[9px] font-semibold text-white/80 mt-0.5">
                    {status === "going" ? "going out" : "might go"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          className="w-full rounded-xl py-3 text-base font-bold transition-all"
          style={{
            backgroundColor: hasSelections ? "#FFFFFF" : "rgba(255,255,255,0.9)",
            color: "#1a1a1a",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
