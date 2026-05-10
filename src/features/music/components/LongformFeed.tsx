import { Mic, Play, Headphones, Radio } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useLongformFeed, type LongformKind } from '../hooks/useLongformAudio';

const KIND_ICON: Record<LongformKind, React.ComponentType<{ className?: string }>> = {
  podcast: Mic,
  mix: Headphones,
  set: Radio,
  interview: Mic,
};

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export function LongformFeed({ kind, title }: { kind?: LongformKind; title?: string }) {
  const { data: episodes = [], isLoading } = useLongformFeed(kind);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        <Mic className="w-10 h-10 mx-auto mb-3 opacity-40" />
        No episodes yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && <h3 className="font-bold text-lg px-1">{title}</h3>}
      {episodes.map((ep) => {
        const Icon = KIND_ICON[ep.kind as LongformKind] ?? Mic;
        return (
          <Link key={ep.id} to={`/music/longform/${ep.id}`}>
            <Card className="flex gap-3 p-3 bg-card/40 border-border/40 hover:border-primary/40 transition-colors min-h-[80px]">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/30 shrink-0 relative">
                {ep.cover_url ? (
                  <img
                    src={ep.cover_url}
                    alt={ep.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-primary rounded-full w-6 h-6 flex items-center justify-center">
                  <Play className="w-3 h-3 text-primary-foreground fill-current" />
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {ep.kind}
                  </Badge>
                  {ep.episode_number != null && (
                    <span className="text-[10px] text-muted-foreground">
                      EP {ep.episode_number}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-sm line-clamp-2">{ep.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtDur(ep.duration_seconds)} · {ep.play_count.toLocaleString()} plays
                </p>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
