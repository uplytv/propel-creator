import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Clock, Send, Pin, PinOff, X, ChevronUp, Flame, MessageSquare, Users, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStreamEngagement, type LiveChatMessage } from "@/hooks/useStreamEngagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  streamId: string;
  streamTitle: string;
  creatorUserId: string;
  onEndStream: () => void;
  isRecording: boolean;
  recordingDuration: number;
}

function formatTimer(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function CreatorStreamOverlay({
  streamId, streamTitle, creatorUserId, onEndStream, isRecording, recordingDuration,
}: Props) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const {
    chatMessages, floatingReactions, reactionCount, energyScore,
    viewerCount, activityFeed, sendChatMessage, togglePinMessage,
    startEnergyBroadcast, bumpEnergy,
  } = useStreamEngagement(streamId, creatorUserId);

  const [chatInput, setChatInput] = useState("");
  const [showDashboard, setShowDashboard] = useState(!isMobile);
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const activityScrollRef = useRef<HTMLDivElement>(null);
  const [coachingNudge, setCoachingNudge] = useState<string | null>(null);
  const prevEnergy = useRef(0);

  // Stats
  const totalMessages = chatMessages.length;
  const totalSubs = activityFeed.filter((a) => a.type === "subscribe").length;
  const emojiBreakdown = chatMessages.length > 0 ? {} : {};

  // Get profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  // Start energy broadcast
  useEffect(() => {
    if (isRecording) {
      const cleanup = startEnergyBroadcast();
      return cleanup;
    }
  }, [isRecording, startEnergyBroadcast]);

  // Coaching nudges
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

  // Auto-scroll
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);
  useEffect(() => {
    if (activityScrollRef.current) activityScrollRef.current.scrollTop = activityScrollRef.current.scrollHeight;
  }, [activityFeed]);

  const handleSend = async () => {
    if (!user || !profile || !chatInput.trim()) return;
    await sendChatMessage(user.id, profile.display_name || "Creator", profile.avatar_url, chatInput);
    setChatInput("");
  };

  const handlePin = (msg: LiveChatMessage) => {
    togglePinMessage(msg.id, msg.is_pinned);
  };

  // Reaction emoji counts
  const reactionCounts: Record<string, number> = {};
  floatingReactions.forEach((r) => { reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1; });

  // Mobile collapsed view
  if (isMobile && !showDashboard) {
    return (
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Top stats bar */}
        <div className="pointer-events-auto absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2"
          style={{ backgroundColor: "rgba(10,10,10,0.8)", backdropFilter: "blur(12px)" }}>
          {/* Timer */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-red-400">{formatTimer(recordingDuration)}</span>
          </div>
          {/* Viewers */}
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-white/60" />
            <span className="text-xs font-semibold text-white">{viewerCount}</span>
          </div>
          {/* Energy */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full" style={{ width: `${energyScore}%`, backgroundColor: "#00FF85" }} />
            </div>
            <span className="text-[10px] font-bold" style={{ color: "#00FF85" }}>{energyScore}%</span>
          </div>
          {/* End */}
          <button onClick={onEndStream} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500 text-white">
            End
          </button>
        </div>

        {/* Swipe-up dashboard trigger */}
        <button
          onClick={() => setShowDashboard(true)}
          className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-white/60"
          style={{ backgroundColor: "rgba(10,10,10,0.7)", backdropFilter: "blur(8px)" }}
        >
          <ChevronUp className="w-3 h-3" /> Dashboard
        </button>

        {/* Coaching nudge */}
        <AnimatePresence>
          {coachingNudge && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="pointer-events-auto absolute bottom-16 left-4 right-4 rounded-xl px-4 py-3 text-sm font-bold text-center"
              style={{ backgroundColor: "rgba(0,255,133,0.12)", color: "#00FF85", backdropFilter: "blur(12px)" }}
            >
              {coachingNudge}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full overlay (desktop or mobile expanded)
  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {/* TOP BAR */}
      <div className="pointer-events-auto absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: "rgba(10,10,10,0.8)", backdropFilter: "blur(12px)" }}>
        {/* Timer */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-mono font-bold text-red-400">{formatTimer(recordingDuration)}</span>
        </div>
        {/* Viewers */}
        <div className="flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-white/70" />
          <span className="text-sm font-bold text-white">{viewerCount}</span>
        </div>
        {/* Energy */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <motion.div className="h-full rounded-full" style={{ backgroundColor: "#00FF85" }}
              animate={{ width: `${energyScore}%`, opacity: energyScore >= 50 ? [1, 0.6, 1] : 1 }}
              transition={energyScore >= 50 ? { opacity: { duration: 2, repeat: Infinity } } : {}} />
          </div>
          <span className="text-xs font-bold" style={{ color: "#00FF85" }}>{energyScore}%</span>
        </div>
        {/* End stream */}
        <button onClick={onEndStream} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">
          End Stream
        </button>
        {isMobile && (
          <button onClick={() => setShowDashboard(false)} className="text-white/40 hover:text-white ml-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* LEFT: Activity Feed */}
      <div className="pointer-events-auto absolute left-0 top-12 bottom-16 w-52 overflow-hidden" style={{ maxHeight: "calc(100% - 7rem)" }}>
        <div ref={activityScrollRef} className="h-full overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
          <AnimatePresence initial={false}>
            {activityFeed.slice(-30).map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] truncate py-0.5"
                style={{ color: a.color }}
              >
                {a.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT: Chat */}
      <div className="pointer-events-auto absolute right-0 top-12 bottom-16 w-72 flex flex-col"
        style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(16px)" }}>
        <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <span className="text-xs font-semibold text-white/80">Live Chat</span>
          <span className="text-[10px] text-white/40">{viewerCount} watching</span>
        </div>
        {/* Pinned */}
        {chatMessages.filter((m) => m.is_pinned).map((pm) => (
          <div key={pm.id} className="mx-3 mt-2 rounded-lg px-3 py-2 text-xs"
            style={{ border: "1px solid #00FF85", backgroundColor: "rgba(0,255,133,0.05)" }}>
            <span className="font-bold" style={{ color: "#00FF85" }}>📌 {pm.username}:</span>{" "}
            <span className="text-white/80">{pm.message}</span>
          </div>
        ))}
        {/* Messages */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin">
          {chatMessages.map((msg) => {
            const isCreator = msg.user_id === creatorUserId;
            return (
              <div key={msg.id} className="text-sm group relative py-0.5 pr-6" onClick={() => handlePin(msg)} style={{ cursor: "pointer" }}>
                <span className="inline-flex items-center gap-1">
                  {isCreator && <span className="text-xs">⭐</span>}
                  <span className="font-semibold" style={{ color: isCreator ? "#FFD700" : "#00FF85" }}>
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
        {/* Input */}
        <div className="px-3 py-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Say something..."
              className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <button onClick={handleSend} className="px-3 py-2 rounded-lg" style={{ backgroundColor: "#00FF85", color: "#0A0A0A" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 flex items-center gap-4 px-4 py-2"
        style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)" }}>
        {/* Emoji breakdown */}
        <div className="flex items-center gap-2">
          {["🔥", "💰", "👑", "🚀", "💯", "❤️"].map((e) => (
            <span key={e} className="text-xs text-white/50">{e} {reactionCounts[e] || 0}</span>
          ))}
        </div>
        <div className="h-4 w-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
        <span className="text-xs text-white/50 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> {totalMessages}
        </span>
        <span className="text-xs text-white/50 flex items-center gap-1">
          <Users className="w-3 h-3" /> {totalSubs} new
        </span>
        <div className="flex-1" />
        <span className="text-xs text-white/20">📎 Clip — coming soon</span>
      </div>

      {/* Coaching nudge */}
      <AnimatePresence>
        {coachingNudge && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="pointer-events-auto absolute bottom-14 left-1/2 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold"
            style={{ backgroundColor: "rgba(0,255,133,0.12)", color: "#00FF85", backdropFilter: "blur(12px)" }}
          >
            {coachingNudge}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
