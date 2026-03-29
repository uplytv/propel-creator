import { motion } from "framer-motion";
import { RotateCcw, Loader2 } from "lucide-react";
import { useSimulcastSessions } from "@/hooks/useSimulcast";
import { useState } from "react";

const PLATFORM_CONFIG: Record<string, { color: string; logo: string; name: string }> = {
  youtube: { color: "#FF0000", logo: "▶", name: "YT" },
  twitch: { color: "#9146FF", logo: "⬡", name: "TTV" },
  kick: { color: "#53FC18", logo: "K", name: "Kick" },
};

interface Props {
  streamId: string;
  creatorId: string;
}

export default function SimulcastStatusBar({ streamId, creatorId }: Props) {
  const { sessions, startSimulcast } = useSimulcastSessions(streamId);
  const [retrying, setRetrying] = useState<string | null>(null);

  const activeSessions = sessions.filter((s) => s.status !== "ended");
  if (!activeSessions.length) return null;

  const handleRetry = async (platform: string) => {
    setRetrying(platform);
    await startSimulcast(streamId, creatorId, platform);
    setRetrying(null);
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1">
      {activeSessions.map((session) => {
        const config = PLATFORM_CONFIG[session.platform];
        if (!config) return null;
        const isLive = session.status === "connecting" || session.status === "live" || session.status === "idle";
        const isFailed = session.status === "failed";

        return (
          <div key={session.id} className="flex items-center gap-1">
            <div className="relative">
              <div
                className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold"
                style={{ backgroundColor: `${config.color}20`, color: config.color }}
              >
                {config.logo}
              </div>
              <div
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background"
                style={{ backgroundColor: isFailed ? "#ef4444" : isLive ? config.color : "#666" }}
              >
                {isLive && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: config.color }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
            </div>
            {isFailed && retrying !== session.platform && (
              <button
                onClick={() => handleRetry(session.platform)}
                className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
            {retrying === session.platform && (
              <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}
