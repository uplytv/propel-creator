import { useState } from 'react';
import { Heart, Reply, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTrackComments, type TrackComment } from '../../hooks/useTrackComments';
import { useAddComment, useDeleteComment, useToggleCommentLike } from '../../hooks/useAddComment';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { useAuth } from '@/context/AuthContext';
import { useTrack } from '../../hooks/useTrack';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

export default function CommentThread({ trackId }: { trackId: string }) {
  const { user } = useAuth();
  const { data: track } = useTrack(trackId);
  const { data: comments = [], isLoading } = useTrackComments(trackId);
  const seek = usePlayerStore((s) => s.seek);
  const del = useDeleteComment(trackId);
  const like = useToggleCommentLike(trackId);
  const add = useAddComment(trackId);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const isCreator = user?.id && track?.creator_id === user.id;

  const top = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  if (isLoading) return <div className="mt-4 text-white/40 text-sm">Loading comments…</div>;

  const renderComment = (c: TrackComment, depth = 0) => {
    const ts = c.timestamp_seconds;
    const canDelete = user?.id === c.user_id || isCreator;
    return (
      <div key={c.id} className={`flex gap-3 ${depth ? 'ml-10 mt-2' : 'mt-3'}`}>
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 bg-white/10"
          style={
            c.profile?.avatar_url
              ? { background: `url(${c.profile.avatar_url}) center/cover` }
              : undefined
          }
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="font-semibold text-white">@{c.profile?.username ?? 'user'}</span>
            {ts !== null && (
              <button
                onClick={() => seek(ts!)}
                className="text-primary hover:underline"
              >
                @{fmt(ts!)}
              </button>
            )}
            <span className="text-white/30">· {new Date(c.created_at).toLocaleDateString()}</span>
          </div>
          <div className="text-sm text-white/90 mt-0.5 whitespace-pre-line">{c.content}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
            <button
              onClick={() => like.mutate(c.id)}
              className="inline-flex items-center gap-1 hover:text-white"
            >
              <Heart className="w-3 h-3" /> {c.like_count || 0}
            </button>
            {depth === 0 && (
              <button
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                className="inline-flex items-center gap-1 hover:text-white"
              >
                <Reply className="w-3 h-3" /> Reply
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  if (confirm('Delete this comment?')) {
                    del.mutate(c.id, {
                      onSuccess: () => toast.success('Deleted'),
                    });
                  }
                }}
                className="inline-flex items-center gap-1 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          {replyTo === c.id && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!replyText.trim()) return;
                add.mutate(
                  { content: replyText.trim(), timestampSeconds: null, parentId: c.id },
                  {
                    onSuccess: () => {
                      setReplyText('');
                      setReplyTo(null);
                    },
                  }
                );
              }}
              className="mt-2 flex gap-2"
            >
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply…"
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-white/30"
                style={{ fontSize: 16 }}
              />
              <button
                type="submit"
                className="px-3 rounded-lg bg-white/10 text-white text-xs font-bold"
                style={{ minHeight: 36 }}
              >
                Post
              </button>
            </form>
          )}
          {depth === 0 && replies(c.id).map((r) => renderComment(r, 1))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-2">
      <h2 className="text-sm font-bold text-white/80 mb-1">
        {comments.length} comment{comments.length === 1 ? '' : 's'}
      </h2>
      {top.length === 0 && (
        <div className="text-xs text-white/40 py-4">Be the first to comment.</div>
      )}
      {top.map((c) => renderComment(c, 0))}
    </div>
  );
}
