import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface TimestampedComment {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  message: string;
  timestamp_seconds: number;
  created_at: string;
}

interface TimestampedCommentsProps {
  contentId: string;
  contentType: "recording" | "vod";
  currentTime: number; // current playback time in seconds
  onSeek?: (time: number) => void;
  duration: number;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TimestampedComments({
  contentId,
  contentType,
  currentTime,
  onSeek,
  duration,
}: TimestampedCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<TimestampedComment[]>([]);
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load user profile
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

  // Load comments
  useEffect(() => {
    if (!contentId) return;

    const loadComments = async () => {
      // Using community_comments as a proxy — in production, use a dedicated table
      const { data } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", contentId)
        .order("created_at", { ascending: true });

      if (data) {
        setComments(
          data.map((c: any) => ({
            id: c.id,
            user_id: c.author_id,
            username: "Viewer",
            avatar_url: null,
            message: c.body,
            timestamp_seconds: 0,
            created_at: c.created_at,
          }))
        );
      }
    };

    loadComments();
  }, [contentId]);

  const handleSend = async () => {
    if (!user || !profile || !input.trim()) return;

    const timestamp = Math.floor(currentTime);
    const newComment: TimestampedComment = {
      id: crypto.randomUUID(),
      user_id: user.id,
      username: profile.display_name || "Viewer",
      avatar_url: profile.avatar_url,
      message: input.trim(),
      timestamp_seconds: timestamp,
      created_at: new Date().toISOString(),
    };

    setComments((prev) => [...prev, newComment].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
    setInput("");
  };

  // Filter comments near current playback time
  const nearbyComments = comments.filter(
    (c) => Math.abs(c.timestamp_seconds - currentTime) < 5
  );

  const sortedComments = [...comments].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  return (
    <div className="border-t border-border">
      {/* Nearby comments indicator */}
      <AnimatePresence>
        {nearbyComments.length > 0 && !expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 bg-primary/5 border-b border-border"
          >
            {nearbyComments.slice(0, 2).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="text-primary font-mono font-semibold">{formatTimestamp(c.timestamp_seconds)}</span>
                <span className="font-semibold text-foreground">{c.username}</span>
                <span className="text-muted-foreground truncate">{c.message}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Timestamped Comments ({comments.length})
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded comment list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div ref={scrollRef} className="max-h-60 overflow-y-auto px-4 py-2 space-y-2">
              {sortedComments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No comments yet. Be the first to leave a timestamped comment!
                </p>
              )}
              {sortedComments.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-2 group cursor-pointer hover:bg-secondary/30 rounded-lg px-2 py-1.5 transition-colors"
                  onClick={() => onSeek?.(c.timestamp_seconds)}
                >
                  <button className="flex-shrink-0 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold hover:bg-primary/20 transition-colors">
                    {formatTimestamp(c.timestamp_seconds)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-foreground">{c.username}</span>
                    <p className="text-xs text-muted-foreground">{c.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            {user ? (
              <div className="px-4 py-3 border-t border-border flex items-center gap-2">
                <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {formatTimestamp(currentTime)}
                </span>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Add a comment at this timestamp..."
                  className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="px-4 py-2 text-center text-xs text-muted-foreground border-t border-border">
                Log in to leave a comment
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
