import { Link } from "react-router-dom";
import { Sparkles, Headphones, Clock } from "lucide-react";
import { useWeeklyRecap } from "../hooks/useWeeklyRecap";

export default function WeeklyRecapCard() {
  const { data: recap, isLoading } = useWeeklyRecap();
  if (isLoading || !recap) return null;

  return (
    <section className="px-4">
      <div
        className="rounded-2xl p-4 border border-white/10"
        style={{ background: "linear-gradient(135deg,rgba(61,124,255,0.18),rgba(176,37,255,0.18))" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#3D7CFF]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Your Week in Music</h2>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-white/60">
              <Headphones className="w-3 h-3" /> Plays
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{recap.totalPlays}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-white/60">
              <Clock className="w-3 h-3" /> Minutes
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{recap.estimatedMinutes}</div>
          </div>
        </div>

        {recap.topTracks.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] text-white/60 uppercase tracking-wider mb-2">Top Tracks</div>
            <div className="space-y-1.5">
              {recap.topTracks.slice(0, 3).map((t, i) => (
                <Link
                  key={t.id}
                  to={`/music/track/${t.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                >
                  <span className="w-5 text-center text-xs text-white/40 tabular-nums">{i + 1}</span>
                  {t.cover_art_url ? (
                    <img src={t.cover_art_url} alt={t.title} loading="lazy" className="w-9 h-9 rounded object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-white/10" />
                  )}
                  <div className="text-sm text-white truncate">{t.title}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {recap.topArtists.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {recap.topArtists.map((a) => (
              <div key={a.creator_id} className="flex flex-col items-center gap-1 min-w-[64px]">
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt={a.display_name} loading="lazy" className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                )}
                <span className="text-[11px] text-white/70 truncate max-w-[70px]">{a.display_name}</span>
                <span className="text-[10px] text-white/40 tabular-nums">{a.plays} plays</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
