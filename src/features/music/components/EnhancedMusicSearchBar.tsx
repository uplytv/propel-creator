import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mic, X, TrendingUp, Clock, Music, Disc3, User as UserIcon, ListMusic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import {
  useMusicSearchHistory,
  useTrendingSearches,
  useRecordSearch,
  useClearSearchHistory,
} from '../hooks/useMusicSearch';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'tracks' | 'artists' | 'albums' | 'playlists';

const FILTERS: { key: Filter; label: string; icon: any }[] = [
  { key: 'all', label: 'All', icon: Search },
  { key: 'tracks', label: 'Tracks', icon: Music },
  { key: 'artists', label: 'Artists', icon: UserIcon },
  { key: 'albums', label: 'Albums', icon: Disc3 },
  { key: 'playlists', label: 'Playlists', icon: ListMusic },
];

export function EnhancedMusicSearchBar() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { data: history = [] } = useMusicSearchHistory();
  const { data: trending = [] } = useTrendingSearches(10);
  const record = useRecordSearch();
  const clear = useClearSearchHistory();

  const voice = useVoiceSearch({
    onResult: (text) => { setQ(text); submit(text); },
  });

  useEffect(() => {
    if (voice.transcript) setQ(voice.transcript);
  }, [voice.transcript]);

  const submit = (override?: string) => {
    const text = (override ?? q).trim();
    if (!text) return;
    record.mutate(text);
    nav(`/music/search?q=${encodeURIComponent(text)}&type=${filter}`);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  const showSuggestions = !q.trim();
  const filteredTrending = useMemo(
    () => trending.filter((t) => !history.includes(t.query)).slice(0, 8),
    [trending, history],
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder={voice.listening ? 'Listening…' : 'Search songs, artists, lyrics…'}
          className={cn('h-12 pl-10 pr-24 text-base rounded-full', voice.listening && 'ring-2 ring-primary')}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {q && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQ('')} aria-label="Clear">
              <X className="h-4 w-4" />
            </Button>
          )}
          {voice.supported && (
            <Button
              variant={voice.listening ? 'default' : 'ghost'}
              size="icon"
              className={cn('h-9 w-9 rounded-full', voice.listening && 'animate-pulse')}
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
              aria-label="Voice search"
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 h-9 text-xs font-bold border transition',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-foreground/80 active:scale-95',
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {f.label}
            </button>
          );
        })}
      </div>

      {showSuggestions && (
        <div className="space-y-5">
          {history.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Recent
                </h3>
                <button onClick={() => clear.mutate()} className="text-[11px] font-bold text-muted-foreground hover:text-primary">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((h) => (
                  <button
                    key={h}
                    onClick={() => { setQ(h); submit(h); }}
                    className="rounded-full border border-border bg-card px-3 h-8 text-xs font-medium hover:border-primary/50"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </section>
          )}

          {filteredTrending.length > 0 && (
            <section>
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> Trending
              </h3>
              <ul className="space-y-1">
                {filteredTrending.map((t, i) => (
                  <li
                    key={t.query}
                    onClick={() => { setQ(t.query); submit(t.query); }}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-display text-sm font-bold tabular-nums text-primary w-5">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm">{t.query}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{t.hits.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
