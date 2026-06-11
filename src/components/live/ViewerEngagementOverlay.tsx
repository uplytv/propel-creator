import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, MessageSquare, Share2, X, Copy, Check, Send, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStreamEngagement, filterProfanity, type LiveChatMessage } from "@/hooks/useStreamEngagement";
import { Drawer } from "vaul";
import { getSiteUrl } from "@/lib/siteUrl";

const EMOJIS = ["🔥", "💰", "👑", "🚀", "💯", "❤️"];

interface Props {
  streamId: string;
  streamTitle: string;
  creatorUserId: string;
}

// Floating reaction bubble
function FloatingEmoji({ emoji, id }: { emoji: string; id: string }) {
  const drift = useMemo(() => ({
    x: Math.random() * 40 - 20,
    startX: 20 + Math.random() * 30,
  }), []);

  return (
    <motion.div
      key={id}
      initial={{ opacity: 1, y: 0, x: drift.startX, scale: 0.5 }}
      animate={{ opacity: 0, y: -300, x: drift.startX + drift.x, scale: 1.2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2, ease: "easeOut" }}
      className="absolute bottom-20 text-2xl pointer-events-none z-30"
      style={{ left: drift.startX }}
    >
      {emoji}
    </motion.div>
  );
}

// Energy bar at top
function EnergyBar({ score }: { score: number }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-40 h-1">
      <motion.div
        className="h-full"
        style={{ backgroundColor: "hsl(var(--primary))" }}
        animate={{
          width: `${score}%`,
          opacity: score >= 50 ? [1, 0.6, 1] : 1,
        }}
        transition={score >= 50 ? { opacity: { duration: 2, repeat: Infinity } } : { duration: 0.5 }}
      />
    </div>
  );
}

// Energy milestone banners
function EnergyMilestones({ score }: { score: number }) {
  const [show75, setShow75] = useState(false);
  const [show100, setShow100] = useState(false);
  const prevScore = useRef(0);

  useEffect(() => {
    if (score >= 75 && prevScore.current < 75) {
      setShow75(true);
      setTimeout(() => setShow75(false), 3000);
    }
    if (score >= 100 && prevScore.current < 100) {
      setShow100(true);
      setTimeout(() => setShow100(false), 3000);
    }
    prevScore.current = score;
  }, [score]);

  return (
    <>
      <AnimatePresence>
        {show75 && !show100 && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute top-2 left-0 right-0 z-50 flex justify-center"
          >
            <div className="px-4 py-2 rounded-full text-sm font-bold"
              style={{ backgroundColor: "rgba(61, 124, 255,0.15)", color: "hsl(var(--primary))", backdropFilter: "blur(12px)" }}>
              🔥 This stream is heating up
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {show100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                className="text-4xl font-black mb-2"
                style={{ color: "hsl(var(--primary))" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                ⚡ FULL ENERGY
              </motion.div>
              {/* Confetti particles */}
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: i % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                    left: "50%",
                    top: "50%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    opacity: 0,
                  }}
                  transition={{ duration: 2, delay: Math.random() * 0.3 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Energy flash overlay
function EnergyFlash({ score, onDismiss }: { score: number; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 1500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onDismiss}
    >
      <div className="text-center">
        <div className="w-48 h-3 rounded-full overflow-hidden mx-auto mb-3" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: "hsl(var(--primary))" }} />
        </div>
        <p className="text-3xl font-black" style={{ color: "hsl(var(--primary))" }}>{score}%</p>
        <p className="text-sm text-white/60 mt-1">Stream Energy</p>
      </div>
    </motion.div>
  );
}

// Share card
function ShareCard({ title, streamId, onClose }: { title: string; streamId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${getSiteUrl()}/stream/${streamId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} — ${url}`)}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-24 right-14 z-50 w-64 rounded-2xl p-4 border"
      style={{ backgroundColor: "rgba(10,10,10,0.92)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-white/80">Share Stream</span>
        <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-3.5 h-3.5" /></button>
      </div>
      <p className="text-sm font-bold text-white mb-3 line-clamp-2">{title}</p>
      <div className="space-y-2">
        <button onClick={copyLink} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--background))" }}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button onClick={shareToX} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border"
          style={{ borderColor: "rgba(255,255,255,0.15)", color: "white" }}>
          Share to 𝕏
        </button>
      </div>
    </motion.div>
  );
}

// Chat message component
function ChatMsg({ msg, creatorUserId, onPin }: { msg: LiveChatMessage; creatorUserId: string; onPin?: (id: string, pinned: boolean) => void }) {
  const isCreator = msg.user_id === creatorUserId;
  const isMember = (msg as any).is_member;

  return (
    <div className="text-sm px-1 py-0.5">
      <span className="inline-flex items-center gap-1">
        {isCreator && <span className="text-xs">⭐</span>}
        <span className="font-semibold" style={{ color: isCreator ? "hsl(var(--warning))" : isMember ? "hsl(var(--primary))" : "white" }}>
          {msg.username}
        </span>
      </span>
      <span className="text-white/70 ml-1.5">{msg.message}</span>
    </div>
  );
}

export default function ViewerEngagementOverlay({ streamId, streamTitle, creatorUserId }: Props) {
  const { user } = useAuth();
  const {
    chatMessages, floatingReactions, reactionCount, energyScore,
    viewerCount, sendReaction, sendChatMessage,
  } = useStreamEngagement(streamId, creatorUserId);

  const [emojiTrayOpen, setEmojiTrayOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [energyFlash, setEnergyFlash] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);

  // Get user profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    await sendReaction(emoji, user.id);
    setEmojiTrayOpen(false);
  };

  const handleSendChat = async () => {
    if (!user || !profile || !chatInput.trim()) return;
    await sendChatMessage(user.id, profile.display_name || "Anon", profile.avatar_url, chatInput);
    setChatInput("");
  };

  const pinnedMessages = chatMessages.filter((m) => m.is_pinned);

  return (
    <>
      {/* Energy bar */}
      <EnergyBar score={energyScore} />
      <EnergyMilestones score={energyScore} />

      {/* Floating reactions */}
      <AnimatePresence>
        {floatingReactions.map((r) => (
          <FloatingEmoji key={r.id} emoji={r.emoji} id={r.id} />
        ))}
      </AnimatePresence>

      {/* Right action bar — React, Chat, Share only */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4">

        {/* React */}
        <div className="relative flex flex-col items-center gap-1">
          <button
            onClick={() => setEmojiTrayOpen(!emojiTrayOpen)}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)" }}>
            <Flame className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
          </button>
          <span className="text-[10px] text-white/60 font-semibold tabular-nums">{reactionCount}</span>
          <AnimatePresence>
            {emojiTrayOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                className="absolute right-14 top-0 flex gap-1 rounded-full px-2 py-1.5"
                style={{ backgroundColor: "rgba(10,10,10,0.92)", backdropFilter: "blur(16px)" }}>
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => handleReaction(e)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-lg hover:scale-125 transition-transform"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                    {e}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat */}
        <div className="flex flex-col items-center gap-1">
          <Drawer.Root>
            <Drawer.Trigger asChild>
              <button
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)" }}>
                <MessageSquare className="w-5 h-5 text-white" />
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-[90]" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
              <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[91] flex flex-col rounded-t-2xl outline-none"
                style={{ backgroundColor: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)", maxHeight: "70vh" }}>
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                </div>
                <div className="px-4 py-2 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <span className="text-xs font-semibold text-white/80">Live Chat</span>
                  <span className="text-[10px] text-white/40">{viewerCount} watching</span>
                </div>
                {pinnedMessages.length > 0 && (
                  <div className="px-4 py-2">
                    {pinnedMessages.map((pm) => (
                      <div key={pm.id} className="rounded-lg px-3 py-2 text-xs mb-1"
                        style={{ border: "1px solid hsl(var(--primary))", backgroundColor: "rgba(61, 124, 255,0.05)" }}>
                        <span className="font-bold" style={{ color: "hsl(var(--primary))" }}>📌 {pm.username}:</span>{" "}
                        <span className="text-white/80">{pm.message}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                  {chatMessages.map((msg) => (
                    <ChatMsg key={msg.id} msg={msg} creatorUserId={creatorUserId} />
                  ))}
                </div>
                <div className="px-3 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  {user ? (
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                        placeholder="Send a message..."
                        style={{ fontSize: 16, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                        className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
                      />
                      <button onClick={handleSendChat} className="px-3 py-2 rounded-lg" style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--background))" }}>
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-white/40 py-2">Log in to chat</p>
                  )}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
          <span className="text-[10px] text-white/60 font-semibold">Chat</span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setShareOpen(!shareOpen)}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)" }}>
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <span className="text-[10px] text-white/60 font-semibold">Share</span>
        </div>

      </div>

      {/* Share card */}
      <AnimatePresence>
        {shareOpen && <ShareCard title={streamTitle} streamId={streamId} onClose={() => setShareOpen(false)} />}
      </AnimatePresence>

      {/* Energy flash */}
      <AnimatePresence>
        {energyFlash && <EnergyFlash score={energyScore} onDismiss={() => setEnergyFlash(false)} />}
      </AnimatePresence>
    </>
  );
}
