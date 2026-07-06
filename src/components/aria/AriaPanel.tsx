import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/context/AuthContext";
import { useVoiceAria } from "@/hooks/useVoiceAria";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AriaPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AriaPanel({ open, onClose }: AriaPanelProps) {
  const { profile } = useApp();
  const { user } = useAuth();
  const { data: stats } = useDashboardStats();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getCreatorContext = useCallback(() => ({
    name: profile.name || "Creator",
    total_members: stats?.totalMembers ?? 0,
    active_subscribers: stats?.activeSubscribers ?? 0,
    total_revenue: stats?.totalRevenue ?? 0,
    revenue_this_month: stats?.revenueThisMonth ?? 0,
    new_members_this_week: stats?.newMembersThisWeek ?? 0,
    total_live_streams: stats?.totalLiveStreams ?? 0,
    creator_type: profile.type || "unknown",
    primary_platform: "UPLY",
  }), [profile, stats]);

  const sendToAria = useCallback(async (message: string, history: Message[]) => {
    const trimmedHistory = history.slice(-20);
    try {
      const { data, error } = await supabase.functions.invoke("aria-chat", {
        body: {
          message,
          conversation_history: trimmedHistory,
          creator_context: getCreatorContext(),
        },
      });
      if (error) throw error;
      return data?.response || "ARIA is thinking... give it a second and try again.";
    } catch {
      return "ARIA is thinking... give it a second and try again.";
    }
  }, [getCreatorContext]);

  useEffect(() => {
    if (open && !hasInitialized) {
      setMessages([]);
      setHasInitialized(true);
      setIsTyping(true);

      const ctx = getCreatorContext();
      const allZero = ctx.total_members === 0 && ctx.active_subscribers === 0 && ctx.total_revenue === 0 && ctx.total_live_streams === 0;

      let greeting: string;
      if (allZero) {
        greeting = `Give me a personalized welcome for a brand new creator named ${ctx.name} who just joined. Their numbers are all zero. Welcome them warmly and ask what they're building and who they're building it for.`;
      } else {
        greeting = `Give me a personalized opening message for ${ctx.name}. Analyze their data and give one specific observation. Their data: ${JSON.stringify(ctx)}`;
      }

      sendToAria(greeting, []).then((response) => {
        setMessages([{ role: "assistant", content: response }]);
        setIsTyping(false);
      });
    }
  }, [open, hasInitialized, getCreatorContext, sendToAria]);

  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
      voice.stopListening();
      voice.stopSpeaking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const voice = useVoiceAria({
    onInterim: (transcript) => setInput(transcript),
    onFinal: (transcript) => handleSend(transcript, true),
  });

  const handleSend = async (textOverride?: string, viaVoice = false) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    const response = await sendToAria(trimmed, newMessages);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setIsTyping(false);
    if (viaVoice) voice.speakReply(response);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 md:bg-transparent" onClick={onClose} />

      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col w-full md:w-[420px] bg-surface border-t-2 border-accent-green"
        style={{ animation: "slideInRight 0.3s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-green" />
              <span className="font-bold text-base text-accent-green font-sans">
                ARIA
              </span>
              {voice.supported && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-surface-border bg-surface-raised text-text-dim text-[9px] font-semibold uppercase tracking-wide">
                  <Mic className="w-2.5 h-2.5" /> Voice
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 text-text-dim">
              Your AI growth partner · Powered by Claude
            </p>
          </div>
          <div className="flex items-center gap-1">
            {voice.supported && (
              <button
                onClick={voice.toggleVoiceReplies}
                title={voice.voiceReplies ? "Mute voice replies" : "Speak replies aloud"}
                aria-label={voice.voiceReplies ? "Mute voice replies" : "Speak replies aloud"}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                {voice.voiceReplies ? (
                  <Volume2 className="w-4 h-4 text-text-dim" />
                ) : (
                  <VolumeX className="w-4 h-4 text-text-dim" />
                )}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <X className="w-5 h-5 text-text-dim" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-surface-raised border-l-[3px] border-accent-green text-foreground/90"
                    : "bg-surface-raised text-foreground"
                }`}
              >
                {msg.role === "assistant" && (
                  <span className="text-accent-green mr-1.5">✦</span>
                )}
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-xl bg-surface-raised border-l-[3px] border-accent-green">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-surface-border">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={voice.listening ? "Listening…" : "Ask ARIA anything..."}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none bg-surface-raised text-foreground border border-surface-border placeholder:text-text-dim"
            />
            {voice.supported && (
              voice.speaking ? (
                <button
                  onClick={voice.stopSpeaking}
                  title="Stop speaking"
                  aria-label="Stop speaking"
                  className="px-3 py-2.5 rounded-lg transition-all bg-surface-raised border border-surface-border text-foreground animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  onClick={voice.toggleListening}
                  title={voice.listening ? "Stop listening" : "Talk to ARIA"}
                  aria-label={voice.listening ? "Stop listening" : "Talk to ARIA"}
                  className={`px-3 py-2.5 rounded-lg transition-all border ${
                    voice.listening
                      ? "bg-destructive text-destructive-foreground border-destructive animate-pulse"
                      : "bg-surface-raised border-surface-border text-text-dim hover:text-foreground"
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )
            )}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="px-3 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40 bg-accent-green text-accent-green-foreground"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {voice.error && (
            <p className="text-[10px] mt-1.5 text-destructive">{voice.error}</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
