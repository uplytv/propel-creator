import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { toast } from "sonner";

const EMOJI_OPTIONS = ["🔥", "❤️", "👀", "👏", "😍"];

interface StoryReactionsProps {
  storyId: string;
  storyOwnerId: string;
  onReply?: () => void;
}

export default function StoryReactions({ storyId, storyOwnerId, onReply }: StoryReactionsProps) {
  const { user } = useAuth();
  const { getOrCreateConversation, sendMessage } = useDirectMessages();
  const [showEmojis, setShowEmojis] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const handleReaction = async (emoji: string) => {
    if (!user) return;
    try {
      await (supabase as any).from("story_reactions").upsert(
        { story_id: storyId, user_id: user.id, emoji },
        { onConflict: "story_id,user_id,emoji" }
      );
      setShowEmojis(false);
      toast.success(`${emoji} sent!`);
    } catch {
      toast.error("Failed to react");
    }
  };

  const handleReply = async () => {
    if (!user || !replyText.trim()) return;
    setSending(true);
    try {
      // Send as a real DM linked to the story → surfaces in unified inbox
      const conversationId = await getOrCreateConversation(storyOwnerId);
      if (!conversationId) throw new Error("Could not start conversation");
      await sendMessage(conversationId, replyText.trim(), { replyToStoryId: storyId });
      setReplyText("");
      toast.success("Reply sent!");
      onReply?.();
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3" onClick={(e) => e.stopPropagation()}>
      {showEmojis ? (
        <div
          className="flex gap-2 items-center px-3 py-2 rounded-full animate-in slide-in-from-bottom-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)" }}
        >
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="text-2xl transition-transform active:scale-125 hover:scale-110"
            >
              {emoji}
            </button>
          ))}
          <button onClick={() => setShowEmojis(false)} className="text-white/50 text-sm ml-1">✕</button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setShowEmojis(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <span className="text-lg">😊</span>
          </button>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReply()}
            placeholder="Reply to story..."
            className="flex-1 px-4 py-2.5 rounded-full text-sm text-white placeholder:text-white/30"
            style={{ background: "rgba(255,255,255,0.1)", border: "none", fontSize: 16, minHeight: 40 }}
          />
          {replyText.trim() && (
            <button
              onClick={handleReply}
              disabled={sending}
              className="px-4 py-2 rounded-full text-sm font-bold transition-transform active:scale-95"
              style={{ background: "#3D7CFF", color: "#0A0A0A" }}
            >
              Send
            </button>
          )}
        </>
      )}
    </div>
  );
}
