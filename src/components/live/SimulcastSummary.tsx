import { useEffect, useState } from "react";
import { Radio, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PLATFORM_CONFIG: Record<string, { color: string; name: string }> = {
  youtube: { color: "#FF0000", name: "YouTube" },
  twitch: { color: "#9146FF", name: "Twitch" },
  kick: { color: "#53FC18", name: "Kick" },
};

interface Props {
  streamId: string;
}

interface SessionSummary {
  platform: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  error_message: string | null;
}

export default function SimulcastSummary({ streamId }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    supabase
      .from("stream_simulcast_sessions")
      .select("platform, status, started_at, ended_at, error_message")
      .eq("stream_id", streamId)
      .then(({ data }) => setSessions((data as any[]) || []));
  }, [streamId]);

  if (!sessions.length) return null;

  const successful = sessions.filter((s) => s.status !== "failed");
  const failed = sessions.filter((s) => s.status === "failed");

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Simulcast Summary</h3>
      </div>

      <div className="space-y-2">
        {sessions.map((s, i) => {
          const config = PLATFORM_CONFIG[s.platform];
          const duration = s.started_at && s.ended_at
            ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
            : null;

          return (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {s.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                <span className="text-sm" style={{ color: config?.color || "white" }}>{config?.name || s.platform}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {s.status === "failed" ? (
                  <span className="text-destructive">{s.error_message || "Failed"}</span>
                ) : duration ? (
                  `${duration} min`
                ) : (
                  "—"
                )}
              </div>
            </div>
          );
        })}
      </div>

      {successful.length > 0 && (
        <p className="text-xs text-muted-foreground">
          You reached additional audiences by simulcasting to {successful.length} platform{successful.length !== 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}
