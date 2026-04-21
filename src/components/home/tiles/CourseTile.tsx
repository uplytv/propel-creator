import { Play, Lock } from "lucide-react";

export interface CourseTileData {
  id: string;
  title: string;
  image: string;
  instructor: string;
  lessons: number;
  durationLabel: string;
  progress?: number; // 0-100
  locked?: boolean;
}

export default function CourseTile({ data }: { data: CourseTileData }) {
  return (
    <div className="shrink-0 w-[300px] bg-[#141414] rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.04] border border-white/5">
      <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
        <img
          src={data.image}
          alt={data.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
          📖 {data.lessons} lessons
        </span>
        <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
          ⏰ {data.durationLabel}
        </span>

        {data.locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Lock className="w-6 h-6 text-white" />
          </div>
        )}

        {!!data.progress && data.progress > 0 && (
          <div
            className="absolute bottom-0 left-0 h-[2px] bg-[#00FF85]"
            style={{ width: `${Math.min(100, data.progress)}%` }}
          />
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-white text-sm font-semibold line-clamp-2 min-h-[34px] leading-tight">
          {data.title}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/50 text-[12px] truncate">{data.instructor}</span>
          {data.progress && data.progress > 0 ? (
            <span className="text-[#00FF85] text-[12px] font-bold">{data.progress}%</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-white text-[12px] font-semibold hover:text-[#00FF85] transition">
              <Play className="w-3 h-3 fill-current" /> Start
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
