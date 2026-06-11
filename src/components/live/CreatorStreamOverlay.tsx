import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Clock, Send, Pin, PinOff, X, ChevronUp, Flame, MessageSquare, Users, Zap, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStreamEngagement, type LiveChatMessage } from "@/hooks/useStreamEngagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useConnectionQuality, type ConnectionQuality } from "@/hooks/useConnectionQuality";

interface Props {
  streamId: string;
  streamTitle: string;
  creatorUserId: string;
  onEndStream: () => void;
  isRecording: boolean;
  recordingDuration: number;
}

function formatTimer(s: number) {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

/**
 * Thin stats bar that overlays on top of the video preview.
 * Does NOT block the video — only a small top strip + optional coaching nudge.
 */
export function CreatorVideoOverlay({
  streamId, creatorUserId, onEndStream, isRecording, recordingDuration,
  energyScore, viewerCount, coachingNudge,
}: {
  streamId: string;
  creatorUserId: string;
  onEndStream: () => void;
  isRecording: boolean;
  recordingDuration: number;
  energyScore: number;
  viewerCount: number;
  coachingNudge: string | null;
}) {
  const connection = useConnectionQuality(isRecording);

  const qualityConfig: Record<ConnectionQuality, { color: string; bars: number; label: string }> = {
    excellent: { color: "hsl(var(--success))", bars: 4, label: "Excellent" },
    good: { color: "hsl(var(--primary))", bars: 3, label: "Good" },
    fair: { color: "hsl(var(--warning))", bars: 2, label: "Fair" },
    poor: { color: "hsl(var(--destructive))", bars: 1, label: "Poor" },
  };
  const qc = qualityConfig[connection.quality];

  return (
    <div className="absolute inset-x-0 top-0 z-20 pointer-events-none">
      {/* Top stats bar */}
      <div
        className="pointer-events-auto flex items-center justify-between px-3 py-2 gap-2"
        style={{ backgroundColor: "rgba(10,10,10,0.75)", backdropFilter: "blur(12px)" }}
      >
        {/* Timer */}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-red-400">{formatTimer(recordingDuration)}</span>
        </div>
        {/* Connection quality */}
        <div className="flex items-center gap-1 group relative" title={`${qc.label}${connection.rttMs !== null ? ` · ${connection.rttMs}ms` : ''}`}>
          <div className="flex items-end gap-[2px] h-3">
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className="w-[3px] rounded-sm transition-colors duration-300"
                style={{
                  height: `${bar * 3}px`,
                  backgroundColor: bar <= qc.bars ? qc.color : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>
        {/* Viewers */}
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3 text-white/60" />
          <span className="text-xs font-semibold text-white">{viewerCount}</span>
        </div>
        {/* Energy */}
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "hsl(var(--primary))" }}
              animate={{ width: `${energyScore}%`, opacity: energyScore >= 50 ? [1, 0.6, 1] : 1 }}
              transition={energyScore >= 50 ? { opacity: { duration: 2, repeat: Infinity } } : {}}
            />
          </div>
          <span className="text-[10px] font-bold" style={{ color: "hsl(var(--primary))" }}>{energyScore}%</span>
        </div>
        {/* End */}
        <button onClick={onEndStream} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500 text-white">
          End Stream
        </button>
      </div>

      {/* Coaching nudge floats over the video briefly */}
      <AnimatePresence>
        {coachingNudge && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="pointer-events-none mx-auto mt-2 w-fit rounded-xl px-4 py-2 text-xs font-bold text-center"
            style={{ backgroundColor: "rgba(61, 124, 255,0.15)", color: "hsl(var(--primary))", backdropFilter: "blur(12px)" }}
          >
            {coachingNudge}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Dashboard panel that renders BELOW the video as normal flow content.
 * Contains: activity feed tabs, chat, emoji breakdown, stats.
 */
export function CreatorDashboardPanel({
  streamId, creatorUserId, streamTitle,
}: {
  streamId: string;
  creatorUserId: string;
  streamTitle: string;
}) {
  const { user } = useAuth();
  const {
    chatMessages, floatingReactions, reactionCount, energyScore,
    viewerCount, activityFeed, sendChatMessage, togglePinMessage,
  } = useStreamEngagement(streamId, creatorUserId);

  const [chatInput, setChatInput] = useState("");
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const totalMessages = chatMessages.length;
  const totalSubs = activityFeed.filter((a) => a.type === "subscribe").length;

  // Reaction emoji counts
  const reactionCounts: Record<string, number> = {};
  floatingReactions.forEach((r) => { reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1; });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  const handleSend = async () => {
    if (!user || !profile || !chatInput.trim()) return;
    await sendChatMessage(user.id, profile.display_name || "Creator", profile.avatar_url, chatInput);
    setChatInput("");
  };

  const handlePin = (msg: LiveChatMessage) => {
    togglePinMessage(msg.id, msg.is_pinned);
  };

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(16px)" }}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white/70 hover:text-white transition-colors"
        style={{ borderBottom: collapsed ? "none" : "1px solid rgba(255,255,255,0.06)" }}
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Dashboard
          {collapsed && (
            <span className="text-[10px] text-white/40 font-normal ml-1">
              {totalMessages} msgs · {viewerCount} viewers
            </span>
          )}
        </span>
        <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronUp className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Activity feed as single-line ticker */}
            <div className="px-3 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <AnimatePresence initial={false}>
                {activityFeed.slice(-5).map((a) => (
                  <motion.span
                    key={a.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[10px] whitespace-nowrap flex-shrink-0"
                    style={{ color: a.color }}
                  >
                    {a.text}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            {/* Chat header */}
            <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-xs font-semibold text-white/80">Live Chat</span>
              <span className="text-[10px] text-white/40">{viewerCount} watching</span>
            </div>

            {/* Pinned */}
            {chatMessages.filter((m) => m.is_pinned).map((pm) => (
              <div key={pm.id} className="mx-3 mt-2 rounded-lg px-3 py-2 text-xs"
                style={{ border: "1px solid #3D7CFF", backgroundColor: "rgba(61, 124, 255,0.05)" }}>
                <span className="font-bold" style={{ color: "hsl(var(--primary))" }}>📌 {pm.username}:</span>{" "}
                <span className="text-white/80">{pm.message}</span>
              </div>
            ))}

            {/* Messages */}
            <div ref={chatScrollRef} className="overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin" style={{ maxHeight: "160px" }}>
              {chatMessages.map((msg) => {
                const isCreator = msg.user_id === creatorUserId;
                return (
                  <div key={msg.id} className="text-xs group relative py-0.5 pr-6 cursor-pointer" onClick={() => handlePin(msg)}>
                    <span className="inline-flex items-center gap-1">
                      {isCreator && <span className="text-[10px]">⭐</span>}
                      <span className="font-semibold" style={{ color: isCreator ? "hsl(var(--warning))" : "hsl(var(--primary))" }}>
                        {msg.username}
                      </span>
                    </span>
                    <span className="text-white/70 ml-1.5">{msg.message}</span>
                    <button className="absolute right-0 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/60">
                      {msg.is_pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Chat input */}
            <div className="px-3 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Say something..."
                  className="flex-1 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <button onClick={handleSend} className="px-3 py-2 rounded-lg" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--background))" }}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom stats bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-t flex-wrap" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {["🔥", "💰", "👑", "🚀", "💯", "❤️"].map((e) => (
                <span key={e} className="text-[10px] text-white/50">{e} {reactionCounts[e] || 0}</span>
              ))}
              <div className="h-3 w-px mx-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <span className="text-[10px] text-white/50 flex items-center gap-0.5">
                <MessageSquare className="w-2.5 h-2.5" /> {totalMessages}
              </span>
              <span className="text-[10px] text-white/50 flex items-center gap-0.5">
                <Users className="w-2.5 h-2.5" /> {totalSubs} new
              </span>
              <div className="flex-1" />
              <span className="text-[10px] text-white/40">📎 Clips auto-generated after stream ends</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Combined wrapper that manages shared state (energy broadcast, coaching nudges)
 * and renders both the video overlay and the dashboard panel.
 */
export default function CreatorStreamOverlay({
  streamId, streamTitle, creatorUserId, onEndStream, isRecording, recordingDuration,
}: Props) {
  const {
    energyScore, viewerCount, startEnergyBroadcast,
  } = useStreamEngagement(streamId, creatorUserId);

  const [coachingNudge, setCoachingNudge] = useState<string | null>(null);
  const prevEnergy = useRef(0);

  useEffect(() => {
    if (isRecording) {
      const cleanup = startEnergyBroadcast();
      return cleanup;
    }
  }, [isRecording, startEnergyBroadcast]);

  useEffect(() => {
    if (energyScore >= 100 && prevEnergy.current < 100) {
      setCoachingNudge("⚡ You're going viral right now.");
      setTimeout(() => setCoachingNudge(null), 4000);
    } else if (energyScore >= 75 && prevEnergy.current < 75) {
      setCoachingNudge("🔥 Keep pushing — chat is on fire.");
      setTimeout(() => setCoachingNudge(null), 4000);
    }
    prevEnergy.current = energyScore;
  }, [energyScore]);

  // This component is now only used as a convenience wrapper.
  // BroadcastStudio should use CreatorVideoOverlay + CreatorDashboardPanel directly.
  return null;
}
