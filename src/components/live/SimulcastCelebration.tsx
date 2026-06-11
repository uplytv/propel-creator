import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const PLATFORM_CONFIG: Record<string, { color: string; logo: string; name: string }> = {
  youtube: { color: "#FF0000", logo: "▶", name: "YouTube" },
  twitch: { color: "#9146FF", logo: "⬡", name: "Twitch" },
  kick: { color: "#53FC18", logo: "K", name: "Kick" },
};

interface Props {
  creatorId: string;
  connectedPlatforms: string[];
}

export default function SimulcastCelebration({ creatorId, connectedPlatforms }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (connectedPlatforms.length < 2) return;

    const check = async () => {
      // Check if first simulcast
      const { data: memory } = await supabase
        .from("aria_agent_memory")
        .select("id")
        .eq("creator_id", creatorId)
        .eq("key", "first_simulcast_completed")
        .limit(1);

      if (memory?.length) return; // Already celebrated

      // Check previous sessions
      const { count } = await supabase
        .from("stream_simulcast_sessions")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .in("status", ["connecting", "live", "idle"]);

      // Current connections are the first ones
      if ((count || 0) <= connectedPlatforms.length + 1) {
        setShow(true);
        // Store memory
        await supabase.from("aria_agent_memory").insert({
          creator_id: creatorId,
          key: "first_simulcast_completed",
          value: { platforms: connectedPlatforms, timestamp: new Date().toISOString() },
          memory_type: "achievement",
          agent_type: "operations",
        });
        setTimeout(() => setShow(false), 4000);
      }
    };

    check();
  }, [creatorId, connectedPlatforms]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => setShow(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            className="rounded-2xl border border-primary/30 bg-card p-8 text-center max-w-sm mx-4"
            style={{ boxShadow: "0 0 60px rgba(61, 124, 255,0.15)" }}
          >
            <p className="text-4xl mb-4">🎉</p>
            <h2 className="text-xl font-bold text-foreground mb-2">
              You're live on {connectedPlatforms.length} platforms!
            </h2>
            <div className="flex items-center justify-center gap-3 mb-4">
              {connectedPlatforms.map((p) => {
                const config = PLATFORM_CONFIG[p];
                return config ? (
                  <div key={p} className="flex items-center gap-1.5">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                      {config.logo}
                    </div>
                    <span className="text-xs text-green-400">✓</span>
                  </div>
                ) : null;
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Your audience on {connectedPlatforms.map((p) => PLATFORM_CONFIG[p]?.name).filter(Boolean).join(", ")}, and UPLY can all watch right now
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
