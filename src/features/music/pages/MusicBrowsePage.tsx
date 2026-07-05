import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, TrendingUp } from "lucide-react";
import { MOODS } from "../lib/moods";
import { GENRES } from "../lib/genres";
import MoodTile from "../components/MoodTile";
import GenreChip from "../components/GenreChip";
import SpotlightCard from "../components/SpotlightCard";
import { useEditorialSpotlights } from "../hooks/useEditorialSpotlights";
import { useTrendingSearches } from "../hooks/useSearchHistory";

export default function MusicBrowsePage() {
  const { data: spotlights } = useEditorialSpotlights();
  const { data: trending } = useTrendingSearches(10);

  return (
    <div className="pb-40">
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link to="/music" className="p-2 rounded-full bg-white/5 text-white" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black text-white">Browse</h1>
      </header>

      {(spotlights?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white px-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Editor's Picks
          </h2>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2">
            {spotlights!.map((s) => (
              <SpotlightCard key={s.id} item={s} />
            ))}
          </div>
        </section>
      )}

      {(trending?.length ?? 0) > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-bold text-white px-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/70" /> Trending Searches
          </h2>
          <div className="flex gap-2 overflow-x-auto px-4 pb-2">
            {trending!.map((q) => (
              <Link
                key={q}
                to={`/music/search?q=${encodeURIComponent(q)}`}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-white/80 border border-white/10"
              >
                {q}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 space-y-3 px-4">
        <h2 className="text-lg font-bold text-white">Moods & Activities</h2>
        <div className="grid grid-cols-2 gap-3">
          {MOODS.map((m) => (
            <MoodTile key={m} mood={m} />
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-3 px-4">
        <h2 className="text-lg font-bold text-white">All Genres</h2>
        <div className="flex gap-2 flex-wrap">
          {GENRES.map((g) => (
            <GenreChip key={g} genre={g} />
          ))}
        </div>
      </section>
    </div>
  );
}
