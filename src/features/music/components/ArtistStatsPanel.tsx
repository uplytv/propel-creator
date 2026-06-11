import { useArtistStats } from "../hooks/useArtistStats";
import { Users, Headphones, MapPin, Globe } from "lucide-react";

interface Props {
  artistId?: string;
}

export default function ArtistStatsPanel({ artistId }: Props) {
  const { data, isLoading } = useArtistStats(artistId);

  if (isLoading || !data) {
    return <div className="h-32 rounded-xl bg-white/5 animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Users className="w-4 h-4 mb-2" style={{ color: "#3D7CFF" }} />
          <p className="text-white font-black text-2xl">{data.monthly_listeners.toLocaleString()}</p>
          <p className="text-white/40 text-[11px]">Monthly Listeners</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
          <Headphones className="w-4 h-4 mb-2" style={{ color: "#00E5FF" }} />
          <p className="text-white font-black text-2xl">{data.total_plays.toLocaleString()}</p>
          <p className="text-white/40 text-[11px]">Total Plays (30d)</p>
        </div>
      </div>

      {data.top_countries.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-white/60" />
            <h3 className="text-white font-bold text-sm">Top Countries</h3>
          </div>
          <div className="space-y-2">
            {data.top_countries.slice(0, 5).map((c) => (
              <div key={c.country} className="flex items-center justify-between text-sm">
                <span className="text-white/80">{c.country}</span>
                <span className="text-white/50">{c.listeners.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.top_cities.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-white/60" />
            <h3 className="text-white font-bold text-sm">Top Cities</h3>
          </div>
          <div className="space-y-2">
            {data.top_cities.slice(0, 5).map((c) => (
              <div key={c.city} className="flex items-center justify-between text-sm">
                <span className="text-white/80">{c.city}</span>
                <span className="text-white/50">{c.listeners.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
