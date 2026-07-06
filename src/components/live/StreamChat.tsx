import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Crown, Coins, Pin, PinOff, Star, Smile, MoreVertical, Trash2, Clock, Ban, Timer } from "lucide-react";
import { toast } from "sonner";
import ChatEmotePicker from "./ChatEmoteSystem";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useStreamEngagement, type LiveChatMessage } from "@/hooks/useStreamEngagement";
import { useStreamModeration } from "@/hooks/useStreamModeration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HypeTrainBanner from "./HypeTrainBanner";

const SLOW_MODE_OPTIONS = [0, 5, 30] as const;

interface StreamChatProps {
  streamId?: string;
  creatorUserId?: string;
  isLoggedIn?: boolean;
  onTipClick?: () => void;
  creditsBalance?: number;
}

export default function StreamChat({
  streamId,
  creatorUserId,
  isLoggedIn = false,
  onTipClick,
  creditsBalance = 0,
}: StreamChatProps) {
  const { user } = useAuth();
  const {
    chatMessages,
    sendChatMessage,
    togglePinMessage,
    viewerCount,
  } = useStreamEngagement(streamId, creatorUserId);
  const {
    isOwner,
    restriction,
    refreshRestriction,
    slowModeSeconds,
    setSlowMode,
    deleteMessage,
    timeoutUser,
    banUser,
  } = useStreamModeration(streamId, creatorUserId, user?.id);

  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get user profile for sending messages
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async () => {
    if (!input.trim() || !user || !profile) return;
    const errorMessage = await sendChatMessage(
      user.id,
      profile.display_name || "Anon",
      profile.avatar_url,
      input
    );
    if (errorMessage) {
      toast.error(errorMessage);
      refreshRestriction(); // in case a ban/timeout just landed
      return;
    }
    setInput("");
  };

  const handleModAction = async (action: () => Promise<string | undefined>, success: string) => {
    const errorMessage = await action();
    if (errorMessage) toast.error(errorMessage);
    else toast.success(success);
  };

  const restrictionLabel = restriction
    ? restriction.kind === "ban"
      ? "You've been banned from this chat."
      : restriction.expires_at
      ? `You're timed out until ${new Date(restriction.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
      : "You're timed out."
    : null;

  const pinnedMessages = chatMessages.filter((m) => m.is_pinned);
  // Only render the most recent messages to bound the DOM on long live streams
  // (data is retained in full for pins/hype-train; scrollback beyond this is trimmed).
  const MAX_RENDERED_MESSAGES = 200;
  const renderedMessages =
    chatMessages.length > MAX_RENDERED_MESSAGES ? chatMessages.slice(-MAX_RENDERED_MESSAGES) : chatMessages;

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-xl border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Live Chat</h3>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <div className="flex items-center gap-1" title="Slow mode">
              <Timer className="w-3 h-3 text-muted-foreground" />
              {SLOW_MODE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    const errorMessage = await setSlowMode(s);
                    if (errorMessage) toast.error(errorMessage);
                    else toast.success(s === 0 ? "Slow mode off" : `Slow mode: ${s}s`);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    slowModeSeconds === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {s === 0 ? "Off" : `${s}s`}
                </button>
              ))}
            </div>
          ) : (
            slowModeSeconds > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Slow mode is on">
                <Timer className="w-3 h-3" /> {slowModeSeconds}s
              </span>
            )
          )}
          <span className="text-[10px] text-muted-foreground">{viewerCount} watching</span>
        </div>
      </div>

      {/* Hype Train */}
      <HypeTrainBanner chatMessages={chatMessages} />

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          {pinnedMessages.map((pm) => (
            <div
              key={pm.id}
              className="rounded-lg px-3 py-2 text-xs mb-1 border border-primary/30 bg-primary/5"
            >
              <span className="font-bold text-primary">📌 {pm.username}:</span>{" "}
              <span className="text-muted-foreground">{pm.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-thin">
        <AnimatePresence initial={false}>
          {renderedMessages.map((msg) => {
            const isCreator = creatorUserId && msg.user_id === creatorUserId;
            const isMember = (msg as any).is_member;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm group relative pr-6"
              >
                <span className="inline-flex items-center gap-1.5">
                  {isCreator && <Star className="w-3 h-3 text-warning flex-shrink-0 fill-current" />}
                  {!isCreator && isMember && (
                    <Crown className="w-3 h-3 text-primary flex-shrink-0" />
                  )}
                  <span
                    className={`font-semibold ${
                      isCreator
                        ? "text-warning"
                        : isMember
                        ? "text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {msg.username}
                  </span>
                </span>
                <span className="text-muted-foreground ml-1.5">{msg.message}</span>
                {isOwner && msg.user_id !== user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label="Moderate message"
                        className="absolute right-0 top-0 p-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() =>
                          handleModAction(() => deleteMessage(msg.id), "Message deleted")
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete message
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleModAction(() => timeoutUser(msg.user_id, 5), `${msg.username} timed out for 5m`)
                        }
                      >
                        <Clock className="w-3.5 h-3.5 mr-2" /> Timeout 5m
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          handleModAction(() => banUser(msg.user_id), `${msg.username} banned from chat`)
                        }
                      >
                        <Ban className="w-3.5 h-3.5 mr-2" /> Ban from chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {chatMessages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            No messages yet — be the first to say something!
          </p>
        )}
      </div>

      {/* Input area */}
      <div className="px-3 py-3 border-t border-border">
        {isLoggedIn && restrictionLabel ? (
          <div className="space-y-1.5">
            <input
              type="text"
              disabled
              placeholder={restriction?.kind === "ban" ? "Banned from chat" : "Timed out"}
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground cursor-not-allowed opacity-60"
            />
            <p className="text-[11px] text-destructive px-1">{restrictionLabel}</p>
          </div>
        ) : isLoggedIn ? (
          <div className="space-y-2">
            {/* Credits balance + Tip button */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Coins className="w-3 h-3 text-warning" />
                <span className="text-warning font-semibold">{creditsBalance}</span> credits
              </span>
              {onTipClick && (
                <button
                  onClick={onTipClick}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-all text-xs font-medium"
                >
                  <Coins className="w-3 h-3" />
                  Send Tip
                </button>
              )}
            </div>
            <div className="flex gap-2 items-end">
              <ChatEmotePicker onSelectEmote={(emote) => setInput((prev) => prev + emote)} />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Send a message..."
                className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={handleSend}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button className="w-full py-2.5 rounded-lg bg-secondary/50 text-muted-foreground text-sm font-medium hover:bg-secondary transition-colors">
            Log in to chat
          </button>
        )}
      </div>
    </div>
  );
}
