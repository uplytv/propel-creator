import { useState } from "react";
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
    // If cycling back to undefined, we'd delete - simplified for now
  };

  return (
    <div className="mx-4 my-3 rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-sm font-semibold text-white mb-2">Going out this week?</p>
      <p className="text-xs text-white/40 mb-3">Choose which days</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {days.map((date) => {
          const status = getStatus(date);
          const dayLabel = isToday(date) ? "today" : format(date, "EEE").toLowerCase();
          return (
            <button
              key={date.toISOString()}
              onClick={() => toggleStatus(date)}
              className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all flex-shrink-0"
              style={{
                backgroundColor: status === "going" ? "rgba(0,255,133,0.15)" : status === "maybe" ? "rgba(255,255,255,0.06)" : "transparent",
                border: status ? "1px solid rgba(0,255,133,0.3)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {status && <span className="text-lg">{EMOJIS[status]}</span>}
              <span className="text-xs font-semibold text-white">{dayLabel}</span>
              <span className="text-[10px] text-white/40">{format(date, "d")}</span>
              {status && (
                <span className="text-[9px] text-primary" style={{ color: "#00FF85" }}>
                  {status === "going" ? "going out" : "might go"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
