import { Radio, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLiveParties } from '../hooks/useListeningParties';

export function LivePartiesShelf() {
  const { data: parties = [], isLoading } = useLiveParties();

  if (isLoading) {
    return <div className="h-32 rounded-xl bg-muted/20 animate-pulse" />;
  }
  if (parties.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
        No live listening parties right now
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </span>
        <h3 className="font-bold text-lg">Live parties</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {parties.map((p) => (
          <Link key={p.id} to={`/music/party/${p.id}`}>
            <Card className="flex gap-3 p-3 bg-card/40 border-border/40 hover:border-primary/40 transition-colors min-h-[80px]">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/30 shrink-0 relative">
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio className="w-6 h-6 text-primary" />
                  </div>
                )}
                <Badge className="absolute top-1 left-1 bg-red-500 text-white text-[9px] px-1.5 py-0">
                  LIVE
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm line-clamp-1">{p.title}</h4>
                {p.current_track_title && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    ▸ {p.current_track_title}
                    {p.current_track_artist ? ` · ${p.current_track_artist}` : ''}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                  <Users className="w-3 h-3" />
                  {p.participant_count.toLocaleString()} listening
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
