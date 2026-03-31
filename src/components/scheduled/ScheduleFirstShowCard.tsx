import { CalendarIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useScheduledStreams } from "@/hooks/useScheduledStreams";
import { useNavigate } from "react-router-dom";

export default function ScheduleFirstShowCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: scheduled } = useScheduledStreams(user?.id);

  // Only show for authenticated creators with zero scheduled streams
  if (!user || (scheduled && scheduled.length > 0)) return null;

  return (
    <div
      className="rounded-lg p-4 border border-primary/30"
      style={{ background: "#111111" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <CalendarIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground mb-1">📺 Schedule your first show</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Creators who publish a schedule get 3× more viewers. Your community gets notified the moment you schedule.
          </p>
          <button
            onClick={() => navigate("/go-live?tab=schedule")}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Schedule a Stream →
          </button>
        </div>
      </div>
    </div>
  );
}
