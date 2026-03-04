import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Crown } from "lucide-react";
import { mockChatMessages } from "@/data/mockStreams";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  isMember: boolean;
  timestamp: string;
}

export default function StreamChat({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate incoming messages
  useEffect(() => {
    const interval = setInterval(() => {
      const names = ["Chris L.", "Pat D.", "Quinn H.", "Dana S.", "Blake F."];
      const msgs = [
        "This is so helpful! 🙌",
        "Can you dive deeper into that?",
        "Just subscribed, let's go!",
        "Love the energy today",
        "Incredible value here 🔥",
        "Taking notes like crazy rn",
      ];
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        user: names[Math.floor(Math.random() * names.length)],
        message: msgs[Math.floor(Math.random() * msgs.length)],
        isMember: Math.random() > 0.5,
        timestamp: "just now",
      };
      setMessages((prev) => [...prev.slice(-50), newMsg]);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

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
              className="text-sm"
            >
              <span className="inline-flex items-center gap-1.5">
                {msg.isMember && (
                  <Crown className="w-3 h-3 text-primary flex-shrink-0" />
                )}
                <span className={`font-semibold ${msg.isMember ? "text-primary" : "text-foreground"}`}>
                  {msg.user}
                </span>
              </span>
              <span className="text-muted-foreground ml-1.5">{msg.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border">
        {isLoggedIn ? (
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
        ) : (
          <button
            className="w-full py-2.5 rounded-lg bg-secondary/50 text-muted-foreground text-sm font-medium hover:bg-secondary transition-colors"
          >
            Log in to chat
          </button>
        )}
      </div>
    </div>
  );
}
