import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, X } from "lucide-react";

// Built-in emote sets — creators can customize later
const EMOTE_SETS: Record<string, { name: string; emotes: string[] }> = {
  default: {
    name: "Standard",
    emotes: ["🔥", "💀", "😂", "❤️", "👀", "💯", "🎉", "😱", "🥶", "💪", "👑", "🚀"],
  },
  hype: {
    name: "Hype",
    emotes: ["⚡", "🤯", "🔥", "💥", "🎊", "🥳", "🤩", "😤", "🫡", "👊", "🙌", "💎"],
  },
  chill: {
    name: "Chill",
    emotes: ["☕", "🌊", "🌿", "🎵", "✨", "💫", "🌙", "🦋", "🌸", "🍃", "🧘", "💭"],
  },
  gaming: {
    name: "Gaming",
    emotes: ["🎮", "⚔️", "🛡️", "💀", "👾", "🏆", "🎯", "🃏", "🪄", "⭐", "🎲", "🧙"],
  },
};

interface ChatEmotePickerProps {
  onSelectEmote: (emote: string) => void;
  subscriberOnly?: boolean;
  isSubscriber?: boolean;
}

export default function ChatEmotePicker({
  onSelectEmote,
  subscriberOnly = false,
  isSubscriber = false,
}: ChatEmotePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeSet, setActiveSet] = useState("default");

  const handleSelect = (emote: string) => {
    onSelectEmote(emote);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        title="Emotes"
      >
        <Smile className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 mb-2 z-50 w-72"
          >
            <div className="rounded-xl border border-border overflow-hidden shadow-xl bg-card">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Emotes</span>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Set tabs */}
              <div className="flex gap-1 px-2 py-1.5 border-b border-border overflow-x-auto">
                {Object.entries(EMOTE_SETS).map(([key, set]) => {
                  const locked = key !== "default" && subscriberOnly && !isSubscriber;
                  return (
                    <button
                      key={key}
                      onClick={() => !locked && setActiveSet(key)}
                      disabled={locked}
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors ${
                        activeSet === key
                          ? "bg-primary/10 text-primary"
                          : locked
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {locked ? "🔒 " : ""}
                      {set.name}
                    </button>
                  );
                })}
              </div>

              {/* Emote grid */}
              <div className="grid grid-cols-6 gap-1 p-2">
                {EMOTE_SETS[activeSet]?.emotes.map((emote, i) => (
                  <button
                    key={`${emote}-${i}`}
                    onClick={() => handleSelect(emote)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-secondary/60 hover:scale-110 transition-all"
                  >
                    {emote}
                  </button>
                ))}
              </div>

              {subscriberOnly && !isSubscriber && activeSet !== "default" && (
                <div className="px-3 py-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground text-center">
                    Subscribe to unlock premium emotes 👑
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline emote renderer — replaces emote codes in messages
export function renderMessageWithEmotes(message: string): string {
  // For now, emotes are already emoji. In future, :code: → custom image
  return message;
}
