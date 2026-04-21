import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useShortComments, useAddShortComment } from "@/hooks/useShortComments";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";

interface Props {
  open: boolean;
  onClose: () => void;
  shortId?: string;
  source?: "clip" | "short";
}

export default function ShortsCommentSheet({ open, onClose, shortId, source }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: comments = [], isLoading } = useShortComments(shortId, source);
  const addComment = useAddShortComment(shortId, source);
  const [body, setBody] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    if (!body.trim() || addComment.isPending) return;
    await addComment.mutateAsync(body);
    setBody("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[61] h-[75vh] rounded-t-2xl bg-card border-t border-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
              </h3>
              <button
                onClick={onClose}
                aria-label="Close comments"
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Be the first to comment</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {(c.display_name || "U").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {c.display_name || "Creator"}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed mt-0.5 break-words">{c.body}</p>
                      <button
                        type="button"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Like comment"
                      >
                        <Heart className="w-3 h-3" /> {c.like_count || 0}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={submit}
              className="border-t border-border p-3 flex items-center gap-2 safe-area-bottom"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {(user?.email || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={user ? "Add a comment…" : "Sign in to comment"}
                disabled={!user || addComment.isPending}
                className="flex-1 bg-muted/50 border border-border rounded-full px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <button
                type="submit"
                disabled={!body.trim() || addComment.isPending}
                aria-label="Post comment"
                className="px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Post
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
