import { Eye, Zap, Lock } from "lucide-react";

export interface LiveTileData {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  creator: string;
  viewers: number;
  simulcastCount: number;
  locked?: boolean;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function LiveTile({ data }: { data: LiveTileData }) {
  return (
    <div className="relative shrink-0 w-[320px] aspect-video rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.04] hover:z-10 bg-[#141414]">
      <img
        src={data.thumbnail}
        alt={data.title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* Top-left LIVE pill */}
      <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 bg-[#FF2D55] px-2 py-0.5 rounded text-white text-[10px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none" />
        LIVE
      </span>

      {/* Top-right simulcast chip */}
      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-white text-[10px] font-bold">
        <Zap className="w-3 h-3 fill-[#00FF85] text-[#00FF85]" />
        {data.simulcastCount}
      </span>

      {data.locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Lock className="w-6 h-6 text-white" />
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1">
        <span className="text-[#00FF85] text-[10px] font-bold tracking-wider uppercase">
          {data.category}
        </span>
        <h3 className="text-white text-sm font-semibold leading-tight line-clamp-2">
          {data.title}
        </h3>
        <div className="flex items-center justify-between text-white/70 text-[11px]">
          <span>@{data.creator}</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatCount(data.viewers)}
          </span>
        </div>
      </div>
    </div>
  );
}
