import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal, X, Clock, TrendingUp, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  searchMusicAdvanced,
  type DurationBucket,
  type SearchSort,
} from '../lib/musicQueries';
import { GENRES } from '../lib/genres';
import { MOODS, MOOD_GENRES, type Mood } from '../lib/moods';
import TrackCard from '../components/TrackCard';
import AlbumCard from '../components/AlbumCard';
import {
  useSearchHistory,
  useRecordSearch,
  useClearSearchHistory,
  useTrendingSearches,
} from '../hooks/useSearchHistory';

export default function MusicSearch() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const initialMood = (params.get('mood') as Mood | null) ?? null;
  const [q, setQ] = useState(initialQ);
  const [showFilters, setShowFilters] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);
  const [mood, setMood] = useState<Mood | null>(initialMood);
  const [hideExplicit, setHideExplicit] = useState(false);
  const [monetization, setMonetization] = useState<'any' | 'free' | 'paid'>('any');
  const [duration, setDuration] = useState<DurationBucket>('any');
  const [sort, setSort] = useState<SearchSort>('relevance');

  const { data: history } = useSearchHistory(8);
  const { data: trending } = useTrendingSearches(8);
  const recordSearch = useRecordSearch();
  const clearHistory = useClearSearchHistory();

  const filters = useMemo(
    () => ({
      genres,
      moodGenres: mood ? MOOD_GENRES[mood] : undefined,
      hideExplicit,
      monetization,
      duration,
      sort,
    }),
    [genres, mood, hideExplicit, monetization, duration, sort],
  );

  const filterCount =
    genres.length +
    (mood ? 1 : 0) +
    (hideExplicit ? 1 : 0) +
    (monetization !== 'any' ? 1 : 0) +
    (duration !== 'any' ? 1 : 0) +
    (sort !== 'relevance' ? 1 : 0);

  const { data, isFetching } = useQuery({
    queryKey: ['music', 'search', q, filters],
    queryFn: () => searchMusicAdvanced(q, filters),
    enabled: q.trim().length >= 2 || filterCount > 0,
  });

  // Persist last meaningful query to history (debounced via effect on q)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = setTimeout(() => recordSearch.mutate(term), 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Keep URL in sync for shareable searches
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (q.trim()) next.set('q', q.trim());
    else next.delete('q');
    if (mood) next.set('mood', mood);
    else next.delete('mood');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, mood]);

  const showSuggestions = q.trim().length < 2 && filterCount === 0;

  const toggleGenre = (g: string) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const clearAll = () => {
    setGenres([]);
    setMood(null);
    setHideExplicit(false);
    setMonetization('any');
    setDuration('any');
    setSort('relevance');
  };

  return (
    <div className="pb-40 max-w-4xl mx-auto px-4 pt-4">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>

      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-full bg-white/5 border border-white/10">
          <Search className="w-4 h-4 text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tracks, albums, artists…"
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40"
            style={{ fontSize: 16 }}
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center border ${
            showFilters || filterCount > 0
              ? 'bg-white text-black border-white'
              : 'bg-white/5 text-white border-white/10'
          }`}
          aria-label="Filters"
        >
          <SlidersHorizontal className="w-5 h-5" />
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-[#3D7CFF] text-black text-xs font-bold flex items-center justify-center px-1.5">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick mood pills (always visible) */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setMood(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
            !mood ? 'bg-white text-black' : 'bg-white/5 text-white/70'
          }`}
        >
          All moods
        </button>
        {MOODS.map((m) => (
          <button
            key={m}
            onClick={() => setMood((cur) => (cur === m ? null : m))}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              mood === m ? 'bg-white text-black' : 'bg-white/5 text-white/70'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="mt-4 space-y-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-wider text-white/50 font-bold">
                Genres
              </div>
              {filterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    genres.includes(g)
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white/70'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50 font-bold mb-2">
                Sort
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SearchSort)}
                className="w-full bg-white/5 text-white rounded-lg px-3 py-2 text-sm border border-white/10"
                style={{ fontSize: 16 }}
              >
                <option value="relevance">Relevance</option>
                <option value="popular">Most played</option>
                <option value="newest">Newest</option>
              </select>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50 font-bold mb-2">
                Length
              </div>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as DurationBucket)}
                className="w-full bg-white/5 text-white rounded-lg px-3 py-2 text-sm border border-white/10"
                style={{ fontSize: 16 }}
              >
                <option value="any">Any length</option>
                <option value="short">Under 2 min</option>
                <option value="medium">2–5 min</option>
                <option value="long">Over 5 min</option>
              </select>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50 font-bold mb-2">
                Pricing
              </div>
              <select
                value={monetization}
                onChange={(e) =>
                  setMonetization(e.target.value as 'any' | 'free' | 'paid')
                }
                className="w-full bg-white/5 text-white rounded-lg px-3 py-2 text-sm border border-white/10"
                style={{ fontSize: 16 }}
              >
                <option value="any">Any</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-white">
              <input
                type="checkbox"
                checked={hideExplicit}
                onChange={(e) => setHideExplicit(e.target.checked)}
                className="w-4 h-4 accent-[#3D7CFF]"
              />
              Hide explicit
            </label>
          </div>
        </div>
      )}

      {showSuggestions && (
        <div className="mt-6 space-y-6">
          {(history?.length ?? 0) > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-sm font-bold text-white/80 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Recent
                </h2>
                <button
                  onClick={() => clearHistory.mutate(undefined)}
                  className="text-[11px] text-white/50 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="flex flex-col">
                {history!.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setQ(h.query)}
                    className="text-left flex items-center justify-between py-2 px-1 text-sm text-white/80 hover:text-white"
                  >
                    <span className="truncate">{h.query}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearHistory.mutate(h.id);
                      }}
                      className="text-white/30 hover:text-white p-1"
                      aria-label="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(trending?.length ?? 0) > 0 && (
            <section>
              <h2 className="text-sm font-bold text-white/80 mb-2 flex items-center gap-2 px-1">
                <TrendingUp className="w-4 h-4" /> Trending
              </h2>
              <div className="flex gap-2 flex-wrap">
                {trending!.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-white/80 border border-white/10"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>
          )}

          <Link
            to="/music/browse"
            className="block text-center py-3 rounded-full bg-white/5 text-white text-sm font-semibold"
          >
            Browse moods, activities & genres →
          </Link>
        </div>
      )}

      {data && (
        <div className="mt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Tracks</h2>
              <span className="text-xs text-white/50">
                {isFetching ? 'Searching…' : `${data.tracks.length} results`}
              </span>
            </div>
            {data.tracks.length === 0 ? (
              <div className="text-sm text-white/40 py-6">
                No tracks match these filters.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.tracks.map((t) => (
                  <TrackCard key={t.id} track={t} queue={data.tracks} />
                ))}
              </div>
            )}
          </div>
          {data.albums.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.albums.map((a) => (
                  <AlbumCard key={a.id} album={a} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
