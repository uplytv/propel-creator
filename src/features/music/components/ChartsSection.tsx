import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useChartTracks } from '../hooks/useChartTracks';
import { GENRES } from '../lib/genres';
import { MOODS, MOOD_GENRES, type Mood } from '../lib/moods';
import ChartTrackRow from './ChartTrackRow';

type Tab = { kind: 'top' } | { kind: 'genre'; value: string } | { kind: 'mood'; value: Mood };

const TABS: Tab[] = [
  { kind: 'top' },
  ...MOODS.map((m) => ({ kind: 'mood' as const, value: m })),
  ...GENRES.filter((g) => g !== 'Other').map((g) => ({ kind: 'genre' as const, value: g })),
];

function tabLabel(t: Tab) {
  if (t.kind === 'top') return 'Top 50';
  return t.value;
}

export default function ChartsSection() {
  const [active, setActive] = useState<Tab>({ kind: 'top' });
  const filters = useMemo(() => {
    if (active.kind === 'top') return { windowDays: 30 };
    if (active.kind === 'genre') return { genres: [active.value], windowDays: 60 };
    return { genres: MOOD_GENRES[active.value], windowDays: 60 };
  }, [active]);

  const { data: tracks, isLoading } = useChartTracks(filters, 20);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-4">
        <TrendingUp className="w-5 h-5 text-white" />
        <h2 className="text-lg font-bold text-white">Charts</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
        {TABS.map((t) => {
          const isActive =
            active.kind === t.kind &&
            (t.kind === 'top' || (active as any).value === (t as any).value);
          return (
            <button
              key={`${t.kind}-${(t as any).value ?? 'top'}`}
              onClick={() => setActive(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {tabLabel(t)}
            </button>
          );
        })}
      </div>

      <div className="px-2">
        {isLoading && (
          <div className="text-sm text-white/40 px-3 py-6">Loading charts…</div>
        )}
        {!isLoading && (tracks?.length ?? 0) === 0 && (
          <div className="text-sm text-white/40 px-3 py-6">
            No charting tracks here yet.
          </div>
        )}
        {(tracks ?? []).map((t, i) => (
          <ChartTrackRow key={t.id} rank={i + 1} track={t} queue={tracks} />
        ))}
      </div>
    </section>
  );
}
