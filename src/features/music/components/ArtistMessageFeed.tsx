import { ExternalLink, Sparkles, ShoppingBag, Users } from 'lucide-react';
import { useEffect } from 'react';
import { useArtistMessages, useMarkMessageRead, useMessageReadIds } from '../hooks/useArtistMessages';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const TARGET_ICONS = { all: Users, superfans: Sparkles, buyers: ShoppingBag } as const;

export function ArtistMessageFeed({ artistId }: { artistId: string }) {
  const { data: messages = [], isLoading } = useArtistMessages(artistId);
  const { data: readIds = new Set() } = useMessageReadIds();
  const markRead = useMarkMessageRead();

  useEffect(() => {
    messages.forEach((m) => {
      if (!readIds.has(m.id)) markRead.mutate(m.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading messages…</div>;
  }
  if (messages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        No messages from this artist yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const Icon = TARGET_ICONS[m.target];
        const unread = !readIds.has(m.id);
        return (
          <li
            key={m.id}
            className={cn(
              'rounded-2xl border bg-card p-4 transition',
              unread ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <h3 className="font-display font-bold">{m.title}</h3>
                  {unread && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <p className="mt-1.5 text-sm text-foreground/90 whitespace-pre-wrap">{m.body}</p>
                {m.link_url && (
                  <a
                    href={m.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Open link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(m.sent_at), { addSuffix: true })}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
