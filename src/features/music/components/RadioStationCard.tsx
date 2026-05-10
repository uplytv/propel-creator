import { Link } from "react-router-dom";
import { Radio, Users } from "lucide-react";
import type { RadioStation } from "../hooks/useRadioStations";

export default function RadioStationCard({ station }: { station: RadioStation }) {
  return (
    <Link
      to={`/music/radio/${station.id}`}
      className="relative shrink-0 w-40 rounded-xl overflow-hidden bg-white/[0.04] border border-white/5 active:scale-[0.98] transition"
    >
      <div
        className="aspect-square relative"
        style={{
          background: station.cover_url
            ? `url(${station.cover_url}) center/cover`
            : "linear-gradient(135deg,#3D7CFF,#B025FF)",
        }}
      >
        {station.is_live && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
        <Radio className="absolute bottom-2 right-2 w-5 h-5 text-white/80" />
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-white truncate">{station.name}</h3>
        <p className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5">
          <Users className="w-3 h-3" />
          {station.listeners_count} listening
        </p>
      </div>
    </Link>
  );
}
