import { useState } from 'react';
import { Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { useAddComment } from '../../hooks/useAddComment';
import { useAuth } from '@/context/AuthContext';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

export default function CommentComposer({ trackId }: { trackId: string }) {
  const { user } = useAuth();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isCurrent = usePlayerStore((s) => s.queue[s.currentIndex]?.id === trackId);
  const position = usePlayerStore((s) => (isCurrent ? s.positionSeconds : 0));
  const [body, setBody] = useState('');
  const [atTime, setAtTime] = useState<boolean>(false);
  const add = useAddComment(trackId);

  // default ON when actively playing this track
  const shouldDefault = isCurrent && isPlaying;
  const effectiveAtTime = atTime || shouldDefault;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = body.trim();
    if (!content) return;
    if (!user) {
      toast.error('Sign in to comment');
      return;
    }
    add.mutate(
      {
        content,
        timestampSeconds: effectiveAtTime && isCurrent ? position : null,
      },
      {
        onSuccess: () => {
          setBody('');
          toast.success('Comment posted');
        },
        onError: (e: any) => toast.error(e?.message || 'Could not post'),
      }
    );
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl bg-white/[0.03] border border-white/5 p-3">
      <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
        <button
          type="button"
          onClick={() => setAtTime((v) => !v)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
            effectiveAtTime
              ? 'border-[#3D7CFF]/40 text-[#3D7CFF] bg-[#3D7CFF]/10'
              : 'border-white/10 text-white/60'
          }`}
          style={{ minHeight: 32 }}
        >
          <Clock className="w-3 h-3" />
          At current time
        </button>
        {isCurrent && <span className="text-white/50">{fmt(position)}</span>}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment…"
          rows={2}
          maxLength={1000}
          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          style={{ fontSize: 16 }}
        />
        <button
          type="submit"
          disabled={!body.trim() || add.isPending}
          className="px-4 rounded-lg bg-[#3D7CFF] text-black font-bold text-sm disabled:opacity-40 inline-flex items-center gap-1"
          style={{ minHeight: 44 }}
        >
          <Send className="w-4 h-4" />
          Post
        </button>
      </div>
    </form>
  );
}
