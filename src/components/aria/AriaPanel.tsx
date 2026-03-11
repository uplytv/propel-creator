import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/context/AuthContext";

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

  // Auto-open greeting
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

  // Reset on close
  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    const response = await sendToAria(trimmed, newMessages);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setIsTyping(false);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 md:bg-transparent" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col w-full md:w-[420px]"
        style={{
          background: "#0F0F0F",
          borderTop: "2px solid #00FF85",
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "#00FF85" }} />
              <span className="font-bold text-base" style={{ color: "#00FF85", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                ARIA
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>
              Your AI growth partner · Powered by Claude
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" style={{ color: "#888" }} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed"
                style={
                  msg.role === "assistant"
                    ? { background: "#1a1a1a", borderLeft: "3px solid #00FF85", color: "#e0e0e0" }
                    : { background: "#1e1e1e", color: "#fff" }
                }
              >
                {msg.role === "assistant" && (
                  <span style={{ color: "#00FF85", marginRight: 6 }}>✦</span>
                )}
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-xl" style={{ background: "#1a1a1a", borderLeft: "3px solid #00FF85" }}>
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#00FF85", animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#00FF85", animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#00FF85", animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask ARIA anything..."
              className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "#1a1a1a", color: "#fff", border: "1px solid #2a2a2a" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-3 py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-40"
              style={{ background: "#00FF85", color: "#0A0A0A" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
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
