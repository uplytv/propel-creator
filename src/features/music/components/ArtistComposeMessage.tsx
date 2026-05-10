import { useState } from 'react';
import { Send, Sparkles, ShoppingBag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSendArtistMessage, type MessageTarget } from '../hooks/useArtistMessages';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const TARGETS: { key: MessageTarget; label: string; icon: any; desc: string }[] = [
  { key: 'all', label: 'All followers', icon: Users, desc: 'Everyone who follows you' },
  { key: 'superfans', label: 'Super fans', icon: Sparkles, desc: 'Top engaged listeners' },
  { key: 'buyers', label: 'Buyers only', icon: ShoppingBag, desc: 'Anyone who bought a track' },
];

export function ArtistComposeMessage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState<MessageTarget>('all');
  const send = useSendArtistMessage();

  const onSend = async () => {
    if (!title.trim() || !body.trim()) return;
    await send.mutateAsync({ title: title.trim(), body: body.trim(), link_url: link.trim() || null, target });
    setTitle(''); setBody(''); setLink('');
    toast({ title: 'Message sent', description: `Your message reached ${target === 'all' ? 'all followers' : target}.` });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Message your fans</h2>
        <p className="text-xs text-muted-foreground">Drop links, announce releases, hype up tour dates.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TARGETS.map((t) => {
          const Icon = t.icon;
          const active = target === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTarget(t.key)}
              className={cn(
                'rounded-xl border p-3 text-left transition active:scale-[0.97]',
                active ? 'border-primary bg-primary/10' : 'border-border bg-card',
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
              <div className="mt-1 text-xs font-bold">{t.label}</div>
              <div className="text-[10px] text-muted-foreground line-clamp-1">{t.desc}</div>
            </button>
          );
        })}
      </div>

      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      <Textarea
        placeholder="What's the news?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={600}
      />
      <Input placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} type="url" />

      <Button onClick={onSend} disabled={!title.trim() || !body.trim() || send.isPending} className="w-full h-11">
        <Send className="h-4 w-4 mr-2" />
        {send.isPending ? 'Sending…' : 'Send message'}
      </Button>
    </section>
  );
}
