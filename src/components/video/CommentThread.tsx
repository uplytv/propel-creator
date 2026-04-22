/**
 * YouTube-style comment thread: top-level comment + lazy-loaded inline replies + likes.
 * Used inside VideoPlayer comments section.
 */
import { useState } from "react";
import { Heart, ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCommentReplies,
  useToggleCommentLike,
  useAddComment,
  type VideoComment,
} from "@/hooks/useVideos";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(d).toLocaleDateString();
}

interface CommentRowProps {
  comment: VideoComment;
  videoId: string;
  isReply?: boolean;
  parentAuthor?: string | null;
  onReplyClick?: () => void;
}

function CommentRow({ comment, videoId, isReply, parentAuthor, onReplyClick }: CommentRowProps) {
  const { user } = useAuth();
  const toggleLike = useToggleCommentLike(videoId);
  const liked = !!comment.is_liked_by_user;

  const handleLike = () => {
    if (!user) {
      toast.error("Sign in to like comments");
      return;
    }
    toggleLike.mutate({ commentId: comment.id, liked });
  };

  return (
    <div className="flex gap-2.5">
      <Avatar className={isReply ? "w-7 h-7 shrink-0" : "w-9 h-9 shrink-0"}>
        <AvatarImage src={comment.profiles?.avatar_url || undefined} loading="lazy" />
        <AvatarFallback>{(comment.profiles?.display_name || "U").charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">
            {comment.profiles?.display_name || "User"}
          </span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-foreground/90 mt-0.5 break-words whitespace-pre-wrap">
          {parentAuthor && isReply && (
            <span className="text-primary font-medium mr-1">@{parentAuthor}</span>
          )}
          {comment.body}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={handleLike}
            disabled={toggleLike.isPending}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors active:scale-95"
            aria-label={liked ? "Unlike comment" : "Like comment"}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-primary text-primary" : ""}`} />
            {comment.like_count > 0 && (
              <span className={`text-[11px] ${liked ? "text-primary font-medium" : ""}`}>
                {comment.like_count}
              </span>
            )}
          </button>
          {onReplyClick && (
            <button
              onClick={onReplyClick}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentThread({
  comment,
  videoId,
}: {
  comment: VideoComment;
  videoId: string;
}) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const addComment = useAddComment(videoId);
  const repliesQuery = useCommentReplies(comment.id, showReplies);

  const handleSubmitReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    try {
      await addComment.mutateAsync({ body: text, parentId: comment.id });
      setReplyText("");
      setReplyOpen(false);
      setShowReplies(true);
    } catch {
      // toast already handled in hook
    }
  };

  return (
    <div className="space-y-2">
      <CommentRow
        comment={comment}
        videoId={videoId}
        onReplyClick={() => {
          if (!user) {
            toast.error("Sign in to reply");
            return;
          }
          setReplyOpen(o => !o);
        }}
      />

      {/* Inline reply composer */}
      {replyOpen && user && (
        <div className="flex items-center gap-2 pl-11">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply to ${comment.profiles?.display_name || "user"}…`}
            className="bg-secondary/50 h-9 text-sm"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmitReply()}
          />
          <Button
            size="sm"
            onClick={handleSubmitReply}
            disabled={!replyText.trim() || addComment.isPending}
            aria-label="Post reply"
          >
            {addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {/* Replies toggle */}
      {comment.reply_count > 0 && (
        <button
          onClick={() => setShowReplies(s => !s)}
          className="ml-11 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {showReplies ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {comment.reply_count} {comment.reply_count === 1 ? "reply" : "replies"}
        </button>
      )}

      {/* Replies list */}
      {showReplies && (
        <div className="ml-11 space-y-3 pt-1">
          {repliesQuery.isLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading replies…
            </div>
          )}
          {repliesQuery.data?.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              videoId={videoId}
              isReply
              parentAuthor={comment.profiles?.display_name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
