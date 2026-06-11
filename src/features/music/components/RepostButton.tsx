import { Repeat2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRepostStatus, useToggleRepost } from '../hooks/useRepost';

export default function RepostButton({
  trackId,
  size = 'md',
}: {
  trackId: string;
  size?: 'sm' | 'md';
}) {
  const { data: reposted } = useRepostStatus(trackId);
  const toggle = useToggleRepost(trackId);

  const dim = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      onClick={() =>
        toggle.mutate(undefined, {
          onSuccess: (now) => toast.success(now ? 'Reposted to your followers' : 'Repost removed'),
          onError: (e: any) => toast.error(e?.message || 'Could not repost'),
        })
      }
      disabled={toggle.isPending}
      aria-label={reposted ? 'Remove repost' : 'Repost'}
      className={`p-2 rounded-full ${reposted ? 'text-[#3D7CFF]' : 'text-white/70 hover:text-white'}`}
    >
      <Repeat2 className={dim} />
    </button>
  );
}
