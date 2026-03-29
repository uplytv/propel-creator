import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, ChevronDown, ChevronUp, Copy, CheckCircle, AlertTriangle, Settings, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSimulcastDestinations } from "@/hooks/useSimulcast";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  username?: string | null;
  enabledPlatforms: string[];
  onTogglePlatform: (platform: string, enabled: boolean) => void;
  simulcastEnabled: boolean;
  onSimulcastToggle: (enabled: boolean) => void;
}

const PLATFORM_CONFIG: Record<string, { color: string; logo: string; name: string }> = {
  youtube: { color: "#FF0000", logo: "▶", name: "YouTube" },
  twitch: { color: "#9146FF", logo: "⬡", name: "Twitch" },
  kick: { color: "#53FC18", logo: "K", name: "Kick" },
};

export default function SimulcastGoLivePanel({ username, enabledPlatforms, onTogglePlatform, simulcastEnabled, onSimulcastToggle }: Props) {
  const { destinations, loading } = useSimulcastDestinations();
  const [expanded, setExpanded] = useState(false);
  const [showDescriptions, setShowDescriptions] = useState(false);

  const configured = destinations.filter((d) => d.stream_key_last_four);
  const enabledCount = configured.filter((d) => enabledPlatforms.includes(d.platform)).length;

  if (loading) return null;

  if (!configured.length) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Radio className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Stream to multiple platforms simultaneously</p>
          <Link to="/settings?tab=simulcast" className="text-xs text-primary hover:underline flex items-center gap-1">
            <Settings className="w-3 h-3" /> Add your stream keys in Settings → Simulcast
          </Link>
        </div>
      </div>
    );
  }

  const descriptions: Record<string, string[]> = {
    youtube: [
      `🔴 Watch live and join my community → uply.tv/creator/${username || "me"}`,
      `💰 Tips and memberships: uply.tv/creator/${username || "me"}`,
    ],
    twitch: [
      `Join my UPLY community → uply.tv/creator/${username || "me"}`,
      `Exclusive content, courses & more 🎯`,
    ],
    kick: [
      `Full community at uply.tv/creator/${username || "me"} 🚀`,
      `Tips & memberships available on UPLY`,
    ],
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
      {/* Master toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Simulcast to {configured.length} platform{configured.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground">
              {simulcastEnabled ? `Broadcasting to ${enabledCount} platform${enabledCount !== 1 ? "s" : ""}` : "Disabled"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={simulcastEnabled}
            onCheckedChange={onSimulcastToggle}
            onClick={(e) => e.stopPropagation()}
          />
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
              {configured.map((dest) => {
                const config = PLATFORM_CONFIG[dest.platform];
                if (!config) return null;
                const isOn = enabledPlatforms.includes(dest.platform);
                return (
                  <div key={dest.platform} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
                        {config.logo}
                      </div>
                      <span className="text-sm text-foreground">{config.name}</span>
                      {dest.platform_label && <span className="text-xs text-muted-foreground">· {dest.platform_label}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {dest.is_verified ? (
                        <span className="text-[10px] text-green-400 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Ready</span>
                      ) : dest.stream_key_last_four ? (
                        <span className="text-[10px] text-yellow-400 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Untested</span>
                      ) : (
                        <span className="text-[10px] text-destructive">No key</span>
                      )}
                      <Switch
                        checked={isOn}
                        onCheckedChange={(checked) => onTogglePlatform(dest.platform, checked)}
                        disabled={!simulcastEnabled}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Descriptions toggle */}
              <button
                onClick={() => setShowDescriptions(!showDescriptions)}
                className="text-xs text-primary hover:underline flex items-center gap-1 pt-2"
              >
                {showDescriptions ? "Hide" : "Copy stream descriptions →"}
              </button>

              <AnimatePresence>
                {showDescriptions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3 pt-2"
                  >
                    {configured.map((dest) => {
                      const lines = descriptions[dest.platform];
                      if (!lines) return null;
                      const config = PLATFORM_CONFIG[dest.platform];
                      return (
                        <div key={dest.platform} className="rounded-lg bg-secondary/30 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: config?.color }}>{config?.name}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(lines.join("\n"));
                                toast.success("Copied!");
                              }}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                          {lines.map((line, i) => (
                            <p key={i} className="text-xs text-muted-foreground">{line}</p>
                          ))}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
