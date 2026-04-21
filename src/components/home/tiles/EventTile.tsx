import { MapPin } from "lucide-react";

export interface EventTileData {
  id: string;
  title: string;
  image: string;
  month: string;
  day: string;
  category: "CONCERT" | "FESTIVAL" | "MEETUP" | "CONFERENCE" | "COMMUNITY";
  venue: string;
  going: number;
  price: string;
}

export default function EventTile({ data }: { data: EventTileData }) {
  return (
    <div className="shrink-0 w-[360px] bg-[#141414] rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.03] border border-white/5">
      {/* Image */}
      <div className="relative w-full" style={{ aspectRatio: "16 / 10" }}>
        <img
          src={data.image}
          alt={data.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Date chip top-left */}
        <div className="absolute top-3 left-3 rounded-md overflow-hidden border border-white/10 bg-[#0A0A0A]/90 backdrop-blur-md flex flex-col items-center w-12">
          <div className="bg-[#00FF85] w-full text-center py-0.5">
            <span className="text-black text-[10px] font-extrabold tracking-wider">
              {data.month}
            </span>
          </div>
          <div className="w-full text-center py-1">
            <span className="text-white text-xl font-extrabold leading-none">{data.day}</span>
          </div>
        </div>

        {/* Category top-right */}
        <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded">
          {data.category}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5">
        <h3 className="text-white text-[15px] font-semibold line-clamp-1">
          {data.title}
        </h3>
        <div className="flex items-center gap-1 text-white/55 text-[12px]">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{data.venue}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/70 text-[12px]">
            👥 {data.going.toLocaleString()} going
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[#00FF85] text-[13px] font-bold">{data.price}</span>
            <button className="bg-white text-black hover:bg-[#00FF85] hover:text-black font-bold text-[11px] px-3 py-1.5 rounded transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85]">
              Get
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
