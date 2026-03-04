import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Crown, Coins } from "lucide-react";
import { mockChatMessages } from "@/data/mockStreams";

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  isMember: boolean;
  timestamp: string;
  isTip?: boolean;
  tipAmount?: number;
  tipEmoji?: string;
}

interface StreamChatProps {
  isLoggedIn?: boolean;
  onTipClick?: () => void;
  creditsBalance?: number;
}

export default function StreamChat({ isLoggedIn = false, onTipClick, creditsBalance = 0 }: StreamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate incoming messages + occasional tips
  useEffect(() => {
    const names = ["Chris L.", "Pat D.", "Quinn H.", "Dana S.", "Blake F."];
    const msgs = [
      "This is so helpful! 🙌",
      "Can you dive deeper into that?",
      "Just subscribed, let's go!",
      "Love the energy today",
      "Incredible value here 🔥",
      "Taking notes like crazy rn",
    ];
    const tipMsgs = [
      { amount: 5, emoji: "☕", text: "Coffee on me!" },
      { amount: 25, emoji: "🔥", text: "Fire content!" },
      { amount: 50, emoji: "💎", text: "You deserve this!" },
      { amount: 100, emoji: "🚀", text: "To the moon!" },
    ];

    const interval = setInterval(() => {
      const isTip = Math.random() < 0.15; // 15% chance of a tip
      if (isTip) {
        const tip = tipMsgs[Math.floor(Math.random() * tipMsgs.length)];
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          user: names[Math.floor(Math.random() * names.length)],
          message: tip.text,
          isMember: true,
          timestamp: "just now",
          isTip: true,
          tipAmount: tip.amount,
          tipEmoji: tip.emoji,
        };
        setMessages((prev) => [...prev.slice(-50), newMsg]);
      } else {
        const newMsg: ChatMessage = {
          id: Date.now().toString(),
          user: names[Math.floor(Math.random() * names.length)],
          message: msgs[Math.floor(Math.random() * msgs.length)],
          isMember: Math.random() > 0.5,
          timestamp: "just now",
        };
        setMessages((prev) => [...prev.slice(-50), newMsg]);
      }
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  // Expose addTipMessage for parent
  const addTipMessage = (amount: number, message: string) => {
    const tipEmojis: Record<number, string> = { 5: "☕", 25: "🔥", 50: "💎", 100: "🚀" };
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        user: "You",
        message: message || "Sent a tip!",
        isMember: true,
        timestamp: "just now",
        isTip: true,
        tipAmount: amount,
        tipEmoji: tipEmojis[amount] ?? "✨",
      },
    ]);
  };

  // Expose via ref or just keep it internal since parent calls onTip
  (StreamChat as any)._addTipMessage = addTipMessage;

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), user: "You", message: input, isMember: true, timestamp: "just now" },
    ]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-xl border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Live Chat</h3>
        <span className="text-[10px] text-muted-foreground">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-sm ${msg.isTip ? "px-2.5 py-2 rounded-lg bg-warning/5 border border-warning/10" : ""}`}
            >
              {msg.isTip ? (
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{msg.tipEmoji}</span>
                    <span className="font-semibold text-warning">{msg.user}</span>
                    <span className="text-muted-foreground">tipped</span>
                    <span className="font-bold text-warning">{msg.tipAmount} credits</span>
                  </div>
                  {msg.message && (
                    <p className="text-muted-foreground mt-0.5 ml-6">{msg.message}</p>
                  )}
                </div>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    {msg.isMember && (
                      <Crown className="w-3 h-3 text-primary flex-shrink-0" />
                    )}
                    <span className={`font-semibold ${msg.isMember ? "text-primary" : "text-foreground"}`}>
                      {msg.user}
                    </span>
                  </span>
                  <span className="text-muted-foreground ml-1.5">{msg.message}</span>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="px-3 py-3 border-t border-border">
        {isLoggedIn ? (
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
            <div className="flex gap-2">
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
