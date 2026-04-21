import { Heart, MessageCircle, Send, Bookmark, Plus } from "lucide-react";

export interface SocialTileData {
  id: string;
  username: string;
  handle: string;
  avatar: string;
  image: string;
  likes: number;
  caption: string;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function SocialTile({ data }: { data: SocialTileData }) {
  return (
    <div className="shrink-0 w-[240px] bg-[#141414] border border-white/5 rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.03]">
      {/* Header */}
      <div className="flex items-center gap-2 p-2.5">
        <img
          src={data.avatar}
          alt={data.username}
          className="w-7 h-7 rounded-full object-cover"
          loading="lazy"
        />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-white text-[12px] font-bold truncate">{data.username}</span>
          <span className="text-white/40 text-[10px] truncate">@{data.handle}</span>
        </div>
        <Plus className="w-4 h-4 text-[#00FF85] ml-auto" />
      </div>

      {/* Square image */}
      <div className="relative w-full aspect-square bg-black/40">
        <img
          src={data.image}
          alt={data.caption}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 p-2.5 text-white">
        <Heart className="w-[18px] h-[18px] cursor-pointer hover:text-[#FF2D55] transition" />
        <MessageCircle className="w-[18px] h-[18px] cursor-pointer hover:text-white/70 transition" />
        <Send className="w-[18px] h-[18px] cursor-pointer hover:text-white/70 transition" />
        <Bookmark className="w-[18px] h-[18px] ml-auto cursor-pointer hover:text-white/70 transition" />
      </div>

      {/* Meta */}
      <div className="px-2.5 pb-3 flex flex-col gap-0.5">
        <span className="text-white text-[12px] font-bold">
          {formatCount(data.likes)} likes
        </span>
        <p className="text-white/80 text-[12px] line-clamp-2">
          <span className="font-bold">{data.username}</span>{" "}
          {data.caption}
        </p>
      </div>
    </div>
  );
}
