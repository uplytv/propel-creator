import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, Users, Radio } from "lucide-react";
import { useEffect } from "react";
import { useRadioStation, useRadioTracks } from "../hooks/useRadioStations";
import { usePlayerStore } from "../hooks/usePlayerStore";

export default function RadioStationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: station } = useRadioStation(id);
  const { data: tracks } = useRadioTracks(id);
  const { current, isPlaying, playTrack, togglePlay } = usePlayerStore() as any;

  const playing = !!current && tracks?.some((t: any) => t.id === current.id);

  useEffect(() => {
    document.title = station ? `${station.name} • UPLY Radio` : "UPLY Radio";
  }, [station]);

  if (!station) {
    return <div className="p-8 text-white/60">Loading station…</div>;
  }

  return (
    <div className="pb-40">
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <Link to="/music" className="p-2 rounded-full bg-white/5 text-white" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-white truncate flex-1">{station.name}</h1>
      </header>

      <div className="px-4">
        <div
          className="aspect-square w-full max-w-sm mx-auto rounded-2xl"
          style={{
            background: station.cover_url
              ? `url(${station.cover_url}) center/cover`
              : "linear-gradient(135deg,#3D7CFF,#B025FF)",
          }}
        />
        <div className="mt-4 text-center">
          {station.is_live && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
          <h2 className="mt-2 text-2xl font-black text-white">{station.name}</h2>
          {station.description && <p className="text-sm text-white/60 mt-1">{station.description}</p>}
          <p className="text-xs text-white/40 mt-1 flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> {station.listeners_count} listening
          </p>
        </div>

        <button
          onClick={() => {
            if (!tracks?.length) return;
            if (playing) togglePlay();
            else playTrack(tracks[0], tracks);
          }}
          className="mt-6 w-full py-3 rounded-full text-white font-bold flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(90deg,#3D7CFF,#B025FF)" }}
        >
          {playing && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          {playing && isPlaying ? "Pause Radio" : "Tune In"}
        </button>

        <section className="mt-8">
          <h3 className="text-sm font-bold text-white/80 mb-2 flex items-center gap-2">
            <Radio className="w-4 h-4" /> Up Next
          </h3>
          <div className="space-y-1">
            {(tracks ?? []).map((t: any, i: number) => (
              <button
                key={t.id}
                onClick={() => playTrack(t, tracks)}
                className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
              >
                <span className="w-6 text-center text-xs text-white/40 tabular-nums">{i + 1}</span>
                {t.cover_art_url ? (
                  <img src={t.cover_art_url} alt={t.title} loading="lazy" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-white/10" />
                )}
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{t.title}</div>
                </div>
              </button>
            ))}
            {!tracks?.length && (
              <p className="text-sm text-white/40">No tracks queued yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
