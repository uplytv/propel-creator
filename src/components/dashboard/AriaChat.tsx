import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Bot, User, Loader2, Plus, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/context/AuthContext";
import { useVoiceAria } from "@/hooks/useVoiceAria";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "How do I get my first 100 members?",
  "What should I price my course at?",
  "Give me a content strategy for this week",
  "Analyze my revenue and suggest improvements",
];

export default function AriaChat() {
  const { profile } = useApp();
  const { user } = useAuth();
  const { data: stats } = useDashboardStats();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    const trimmedHistory = history.slice(-20).map(m => ({ role: m.role, content: m.content }));
    try {
      const { data, error } = await supabase.functions.invoke("aria-chat", {
        body: {
          message,
          conversation_history: trimmedHistory,
          creator_context: getCreatorContext(),
        },
      });
      if (error) throw error;
      return data?.response || "I'm thinking... try again in a moment.";
    } catch {
      return "I'm having trouble connecting right now. Please try again.";
    }
  }, [getCreatorContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const voice = useVoiceAria({
    onInterim: (transcript) => setInput(transcript),
    onFinal: (transcript) => handleSend(transcript, true),
  });

  const handleSend = async (text?: string, viaVoice = false) => {
    const content = (text || input).trim();
    if (!content || isStreaming) return;

    setHasStarted(true);
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    // Auto-resize textarea back
    if (inputRef.current) inputRef.current.style.height = "auto";

    const response = await sendToAria(content, newMessages);
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setIsStreaming(false);
    if (viaVoice) voice.speakReply(response);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setHasStarted(false);
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // Voice controls (hidden on unsupported browsers, e.g. Firefox)
  const voiceControls = voice.supported ? (
    <>
      <button
        type="button"
        onClick={voice.toggleVoiceReplies}
        title={voice.voiceReplies ? "Mute voice replies" : "Speak replies aloud"}
        aria-label={voice.voiceReplies ? "Mute voice replies" : "Speak replies aloud"}
        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        {voice.voiceReplies ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
      {voice.speaking ? (
        <button
          type="button"
          onClick={voice.stopSpeaking}
          title="Stop speaking"
          aria-label="Stop speaking"
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center animate-pulse"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={voice.toggleListening}
          title={voice.listening ? "Stop listening" : "Talk to ARIA"}
          aria-label={voice.listening ? "Stop listening" : "Talk to ARIA"}
          className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            voice.listening
              ? "bg-destructive text-destructive-foreground animate-pulse"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>
      )}
    </>
  ) : null;

  // Empty state / Welcome
  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">ARIA</h2>
          <p className="text-xs text-muted-foreground mb-1 font-medium tracking-wide uppercase">Advanced Revenue Increasing Agent</p>
          <p className="text-sm text-muted-foreground mb-3">
            Your AI growth partner. Ask me anything about growing your creator business.
          </p>
          {voice.supported && (
            <span className="inline-flex items-center gap-1.5 mb-6 px-2 py-1 border border-primary/30 bg-primary/5 text-primary text-[10px] font-semibold uppercase tracking-wide">
              <Mic className="w-3 h-3" /> New: Voice — tap the mic and talk
            </span>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mb-8">
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => handleSend(s)}
                className="text-left px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-secondary/50 transition-all text-sm text-muted-foreground hover:text-foreground"
              >
                {s}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Input at bottom */}
        <div className="w-full max-w-2xl">
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={voice.listening ? "Listening…" : "Ask ARIA anything..."}
              rows={1}
              className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none text-foreground placeholder:text-muted-foreground max-h-[120px]"
            />
            {voiceControls}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-opacity hover:brightness-110"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {voice.error && (
            <p className="text-[10px] text-center text-destructive mt-2">{voice.error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-140px)]">
      {/* New chat button */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">ARIA</span>
          <span className="text-[10px] text-muted-foreground">Advanced Revenue Increasing Agent</span>
          {voice.supported && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-primary/30 bg-primary/5 text-primary text-[9px] font-semibold uppercase tracking-wide">
              <Mic className="w-2.5 h-2.5" /> Voice
            </span>
          )}
        </div>
        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 md:px-4 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 py-4 ${msg.role === "user" ? "" : ""}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                {msg.role === "assistant" ? (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {msg.role === "assistant" ? "ARIA" : "You"}
                </p>
                <div className="text-sm leading-relaxed text-foreground prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 py-4"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex items-center gap-1.5 pt-2">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-2 md:px-4 py-3 border-t border-border">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary/40 transition-colors max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={voice.listening ? "Listening…" : "Ask ARIA anything..."}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none text-foreground placeholder:text-muted-foreground max-h-[120px]"
          />
          {voiceControls}
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-opacity hover:brightness-110"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {voice.error && (
          <p className="text-[10px] text-center text-destructive mt-2">{voice.error}</p>
        )}
        <p className="text-[10px] text-center text-muted-foreground mt-2">ARIA can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}
