/**
 * VideoComments — YouTube-model comment section for NON-LIVE playback
 * (stream recordings, VOD assets, ended-stream rows viewed on demand, uploads).
 *
 * Replaces the live-chat panel on /stream/* whenever playback is not live:
 * live chat only exists while live; recordings get real comments plus a
 * read-only "Chat replay" tab (original live chat messages surfaced in sync
 * with the player time — no composer, nothing is written).
 *
 * Data: public.video_comments generalized by migration 20260707160000 with
 * ref_id/ref_type ('stream'|'recording'|'asset'|'video'), one-level threading
 * (parent_id), like_count (video_comment_likes triggers) and a deleted
 * soft-delete flag (author, or content owner via moderate_video_comment RPC).
 * types.ts predates the migration, so ref columns go through (supabase as any)
 * casts — remove after regenerating types (CLAUDE.md §8).
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Loader2, MessageSquare, Send, Trash2, ChevronDown, ChevronUp, RefreshCw, Play } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { memberAuthUrl } from "@/lib/memberAuth";
import { filterProfanity } from "@/hooks/useStreamEngagement";

export type CommentRefType = "stream" | "recording" | "asset" | "video";

interface VideoCommentsProps {
  refId: string;
  refType: CommentRefType;
  /** Content owner (creator) — may delete any comment on their video. */
  contentOwnerId?: string;
  /** Recording-only: Mux asset id, used to locate the original live session for chat replay. */
  muxAssetId?: string | null;
  /** Playback <video> element (UPLYMuxPlayer onVideoRef) — drives chat-replay sync. */
  videoEl?: HTMLVideoElement | null;
}

interface VComment {
  id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  like_count: number;
  created_at: string;
  deleted: boolean;
  likedByMe: boolean;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

interface ReplayMsg {
  id: string;
  username: string;
  message: string;
  offset: number; // seconds from stream start
}

type CommentSort = "top" | "newest";

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtOffset(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat replay — read-only live chat, revealed in sync with player currentTime.
// Messages with (created_at - stream started_at) <= currentTime are visible;
// binary search keeps forward playback AND seeks (both directions) correct.
// ─────────────────────────────────────────────────────────────────────────────
function ChatReplay({ messages, videoEl }: { messages: ReplayMsg[]; videoEl?: HTMLVideoElement | null }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!videoEl) return;
    const update = () => {
      const t = videoEl.currentTime || 0;
      // messages sorted by offset asc — count = # of messages with offset <= t
      let lo = 0;
      let hi = messages.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (messages[mid].offset <= t) lo = mid + 1;
        else hi = mid;
      }
      setVisibleCount(lo);
    };
    update();
    videoEl.addEventListener("timeupdate", update);
    videoEl.addEventListener("seeked", update);
    return () => {
      videoEl.removeEventListener("timeupdate", update);
      videoEl.removeEventListener("seeked", update);
    };
  }, [videoEl, messages]);

  // Auto-scroll as messages appear (and after seeks)
  useEffect(() => {
    if (visibleCount !== prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCountRef.current = visibleCount;
  }, [visibleCount]);

  const visible = messages.slice(0, visibleCount);

  return (
    <div>
      <div ref={scrollRef} className="max-h-96 overflow-y-auto border border-border bg-card/40 px-4 py-3 space-y-2">
        {visible.length === 0 ? (
          <div className="py-10 text-center">
            <Play className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {videoEl ? "Chat messages will appear as the recording plays." : "Start the recording to replay the live chat."}
            </p>
          </div>
        ) : (
          visible.map((m) => (
            <div key={m.id} className="text-sm leading-snug">
              <span className="text-[10px] font-mono text-muted-foreground mr-2">{fmtOffset(m.offset)}</span>
              <span className="font-semibold text-foreground">{m.username}</span>
              <span className="text-muted-foreground ml-1.5">{m.message}</span>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Replay of the live chat — read-only. {messages.length} message{messages.length === 1 ? "" : "s"} total.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single comment row
// ─────────────────────────────────────────────────────────────────────────────
function CommentRow({
  comment,
  isReply,
  canDelete,
  onLike,
  onDelete,
  onReplyClick,
}: {
  comment: VComment;
  isReply?: boolean;
  canDelete: boolean;
  onLike: (c: VComment) => void;
  onDelete: (c: VComment) => void;
  onReplyClick?: () => void;
}) {
  if (comment.deleted) {
    return (
      <div className={`flex gap-2.5 ${isReply ? "" : ""}`}>
        <div className={`${isReply ? "w-7 h-7" : "w-9 h-9"} shrink-0 bg-muted flex items-center justify-center`}>
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <p className="text-sm italic text-muted-foreground pt-1.5">Comment removed</p>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 group">
      <Avatar className={`${isReply ? "w-7 h-7" : "w-9 h-9"} shrink-0 rounded-none`}>
        <AvatarImage src={comment.profile?.avatar_url || undefined} loading="lazy" />
        <AvatarFallback className="rounded-none">{(comment.profile?.display_name || "U").charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{comment.profile?.display_name || "User"}</span>
          <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-foreground/90 mt-0.5 break-words whitespace-pre-wrap">{comment.body}</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => onLike(comment)}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors active:scale-95"
            aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
          >
            <Heart className={`w-3.5 h-3.5 ${comment.likedByMe ? "fill-primary text-primary" : ""}`} />
            {comment.like_count > 0 && (
              <span className={`text-[11px] ${comment.likedByMe ? "text-primary font-medium" : ""}`}>{comment.like_count}</span>
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
          {canDelete && (
            <button
              onClick={() => onDelete(comment)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Delete comment"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function VideoComments({ refId, refType, contentOwnerId, muxAssetId, videoEl }: VideoCommentsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"comments" | "replay">("comments");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [comments, setComments] = useState<VComment[]>([]);
  const [sort, setSort] = useState<CommentSort>("top");
  const [input, setInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [replay, setReplay] = useState<ReplayMsg[] | null>(null);

  // ── Load comments (+ author profiles + my likes) ──────────────────────────
  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data, error } = await (supabase as any)
        .from("video_comments")
        .select("id, user_id, body, parent_id, like_count, created_at, deleted")
        .eq("ref_id", refId)
        .eq("ref_type", refType)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      const rows: any[] = data || [];

      const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        (profs || []).forEach((p: any) => profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }));
      }

      const likedSet = new Set<string>();
      if (user && rows.length > 0) {
        const { data: likes } = await (supabase as any)
          .from("video_comment_likes")
          .select("comment_id")
          .eq("user_id", user.id)
          .in("comment_id", rows.map((r) => r.id));
        (likes || []).forEach((l: any) => likedSet.add(l.comment_id));
      }

      setComments(
        rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          body: r.body,
          parent_id: r.parent_id,
          like_count: r.like_count ?? 0,
          created_at: r.created_at,
          deleted: !!r.deleted,
          likedByMe: likedSet.has(r.id),
          profile: profileMap.get(r.user_id) || null,
        }))
      );
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [refId, refType, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Chat replay availability (stream recordings only) ─────────────────────
  // recording -> live_stream_sessions (mux_asset_id -> stream_id, started_at)
  // -> live_chat_messages(created_at). Tab hidden when there is no session,
  // no usable started_at, or zero messages.
  useEffect(() => {
    if (refType !== "recording" || !muxAssetId) {
      setReplay(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase
          .from("live_stream_sessions")
          .select("stream_id, started_at")
          .eq("mux_asset_id", muxAssetId)
          .not("started_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled || !session?.stream_id || !session.started_at) return;
        const start = new Date(session.started_at).getTime();
        if (!Number.isFinite(start)) return;

        const { data: msgs } = await supabase
          .from("live_chat_messages")
          .select("id, username, message, created_at")
          .eq("stream_id", session.stream_id)
          .order("created_at", { ascending: true })
          .limit(1000);
        if (cancelled || !msgs || msgs.length === 0) return;

        const list: ReplayMsg[] = msgs
          .map((m: any) => ({
            id: m.id,
            username: m.username || "Viewer",
            message: filterProfanity(m.message || ""),
            offset: Math.max(0, (new Date(m.created_at).getTime() - start) / 1000),
          }))
          .filter((m) => Number.isFinite(m.offset));
        if (list.length === 0) return;
        setReplay(list);
      } catch {
        // replay is a bonus — never surface errors for it
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refType, muxAssetId]);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const { topLevel, repliesByParent, visibleCount } = useMemo(() => {
    const replies = new Map<string, VComment[]>();
    const tops: VComment[] = [];
    let count = 0;
    for (const c of comments) {
      if (!c.deleted) count++;
      if (c.parent_id) {
        if (!replies.has(c.parent_id)) replies.set(c.parent_id, []);
        replies.get(c.parent_id)!.push(c); // already created_at asc
      } else {
        tops.push(c);
      }
    }
    // Hide deleted replies entirely; hide deleted top-levels with no live replies.
    for (const [k, list] of replies) replies.set(k, list.filter((r) => !r.deleted));
    const visibleTops = tops.filter((c) => !c.deleted || (replies.get(c.id)?.length ?? 0) > 0);
    visibleTops.sort((a, b) =>
      sort === "top"
        ? b.like_count - a.like_count || +new Date(b.created_at) - +new Date(a.created_at)
        : +new Date(b.created_at) - +new Date(a.created_at)
    );
    return { topLevel: visibleTops, repliesByParent: replies, visibleCount: count };
  }, [comments, sort]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const postComment = async (body: string, parentId: string | null) => {
    if (!user) return;
    const text = body.trim();
    if (!text) return;
    if (text.length > 2000) {
      toast.error("Comments are limited to 2000 characters");
      return;
    }
    setPosting(true);
    try {
      const { data, error } = await (supabase as any)
        .from("video_comments")
        .insert({ ref_id: refId, ref_type: refType, user_id: user.id, body: text, parent_id: parentId })
        .select("id, created_at")
        .single();
      if (error) throw error;
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setComments((prev) => [
        ...prev,
        {
          id: data.id,
          user_id: user.id,
          body: text,
          parent_id: parentId,
          like_count: 0,
          created_at: data.created_at,
          deleted: false,
          likedByMe: false,
          profile: prof || null,
        },
      ]);
      if (parentId) {
        setReplyText("");
        setReplyOpenFor(null);
        setExpandedThreads((prev) => new Set(prev).add(parentId));
      } else {
        setInput("");
      }
    } catch (e: any) {
      toast.error("Couldn't post comment", { description: e?.message });
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (c: VComment) => {
    if (!user) {
      toast.error("Sign in to like comments");
      return;
    }
    const liked = c.likedByMe;
    // Optimistic
    setComments((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, likedByMe: !liked, like_count: Math.max(0, x.like_count + (liked ? -1 : 1)) } : x
      )
    );
    const { error } = liked
      ? await (supabase as any).from("video_comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id)
      : await (supabase as any).from("video_comment_likes").insert({ comment_id: c.id, user_id: user.id });
    if (error) {
      // Rollback
      setComments((prev) =>
        prev.map((x) =>
          x.id === c.id ? { ...x, likedByMe: liked, like_count: Math.max(0, x.like_count + (liked ? 1 : -1)) } : x
        )
      );
      toast.error("Couldn't update like");
    }
  };

  const deleteComment = async (c: VComment) => {
    // Soft-delete via SECURITY DEFINER RPC — permits the author AND the
    // content owner (moderation), one code path for both.
    const { data, error } = await (supabase as any).rpc("moderate_video_comment", {
      _comment_id: c.id,
      _deleted: true,
    });
    if (error || data === false) {
      toast.error("Couldn't delete comment");
      return;
    }
    setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, deleted: true } : x)));
    toast.success("Comment deleted");
  };

  const isOwner = !!user && !!contentOwnerId && user.id === contentOwnerId;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Tabs: Comments | Chat replay (replay only when usable) */}
      <div className="flex items-center gap-0 border-b border-border mb-4">
        <button
          onClick={() => setTab("comments")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === "comments"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" />
            {visibleCount} Comment{visibleCount === 1 ? "" : "s"}
          </span>
        </button>
        {replay && (
          <button
            onClick={() => setTab("replay")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === "replay"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Chat replay
          </button>
        )}
        {tab === "comments" && (
          <div className="ml-auto flex items-center gap-1 pb-1">
            <button
              onClick={() => setSort("top")}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                sort === "top" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Top
            </button>
            <button
              onClick={() => setSort("newest")}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                sort === "newest" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Newest
            </button>
          </div>
        )}
      </div>

      {tab === "replay" && replay ? (
        <ChatReplay messages={replay} videoEl={videoEl} />
      ) : (
        <div>
          {/* Composer */}
          {user ? (
            <div className="flex gap-2 items-start mb-5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !posting && postComment(input, null)}
                placeholder="Add a comment..."
                maxLength={2000}
                className="flex-1 bg-secondary/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={() => postComment(input, null)}
                disabled={!input.trim() || posting}
                className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                aria-label="Post comment"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate(memberAuthUrl())}
              className="w-full mb-5 py-2.5 border border-border bg-secondary/50 text-muted-foreground text-sm font-medium hover:bg-secondary hover:text-foreground transition-colors"
            >
              Sign in to comment
            </button>
          )}

          {/* States */}
          {status === "loading" && (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-2.5">
                  <Skeleton className="w-9 h-9 shrink-0 rounded-none" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">Couldn't load comments.</p>
              <button
                onClick={load}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {status === "ready" && topLevel.length === 0 && (
            <div className="py-8 text-center">
              <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No comments yet — be the first to comment.</p>
            </div>
          )}

          {/* Threads */}
          {status === "ready" && (
            <div className="space-y-5">
              {topLevel.map((c) => {
                const replies = repliesByParent.get(c.id) || [];
                const expanded = expandedThreads.has(c.id);
                return (
                  <div key={c.id} className="space-y-2">
                    <CommentRow
                      comment={c}
                      canDelete={!!user && (user.id === c.user_id || isOwner)}
                      onLike={toggleLike}
                      onDelete={deleteComment}
                      onReplyClick={
                        user
                          ? () => {
                              setReplyOpenFor((cur) => (cur === c.id ? null : c.id));
                              setReplyText("");
                            }
                          : () => navigate(memberAuthUrl())
                      }
                    />

                    {/* Inline reply composer (one-level threading) */}
                    {replyOpenFor === c.id && user && (
                      <div className="flex items-center gap-2 pl-11">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !posting && postComment(replyText, c.id)}
                          placeholder={`Reply to ${c.profile?.display_name || "user"}…`}
                          maxLength={2000}
                          autoFocus
                          className="flex-1 bg-secondary/50 border border-border px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                        />
                        <button
                          onClick={() => postComment(replyText, c.id)}
                          disabled={!replyText.trim() || posting}
                          className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                          aria-label="Post reply"
                        >
                          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                      </div>
                    )}

                    {/* Replies */}
                    {replies.length > 0 && (
                      <button
                        onClick={() =>
                          setExpandedThreads((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          })
                        }
                        className="ml-11 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {replies.length} {replies.length === 1 ? "reply" : "replies"}
                      </button>
                    )}
                    {expanded && replies.length > 0 && (
                      <div className="ml-11 space-y-3 pt-1">
                        {replies.map((r) => (
                          <CommentRow
                            key={r.id}
                            comment={r}
                            isReply
                            canDelete={!!user && (user.id === r.user_id || isOwner)}
                            onLike={toggleLike}
                            onDelete={deleteComment}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
