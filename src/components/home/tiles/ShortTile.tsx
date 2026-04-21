import { Eye, Heart, Play } from "lucide-react";

export interface ShortTileData {
  id: string;
  image: string;
  creator: string;
  views: number;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function ShortTile({ data }: { data: ShortTileData }) {
  return (
    <div className="group/short relative shrink-0 w-[180px] rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.05] bg-[#141414]" style={{ aspectRatio: "9 / 16" }}>
      <img
        src={data.image}
        alt={`Short by ${data.creator}`}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Top-left views */}
      <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
        <Eye className="w-3 h-3" />
        {formatCount(data.views)}
      </span>

      {/* Center play on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/short:opacity-100 transition-opacity duration-300">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
          <Play className="w-5 h-5 fill-black text-black" />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span
          className="text-white text-[12px] font-bold truncate"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
        >
          @{data.creator}
        </span>
        <Heart className="w-4 h-4 text-white drop-shadow-md" />
      </div>
    </div>
  );
}
