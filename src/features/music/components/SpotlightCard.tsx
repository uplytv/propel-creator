import { Link } from "react-router-dom";
import type { EditorialSpotlight } from "../hooks/useEditorialSpotlights";

export default function SpotlightCard({ item }: { item: EditorialSpotlight }) {
  return (
    <Link
      to={item.link_path}
      className="relative shrink-0 w-72 sm:w-80 aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 active:scale-[0.98] transition"
      style={{
        background: item.cover_url
          ? `url(${item.cover_url}) center/cover`
          : "linear-gradient(135deg,#3D7CFF,#B025FF)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <span className="text-[10px] uppercase tracking-wider font-bold text-[#3D7CFF]">
          Spotlight
        </span>
        <h3 className="text-base font-bold text-white truncate">{item.title}</h3>
        {item.subtitle && (
          <p className="text-xs text-white/70 line-clamp-1">{item.subtitle}</p>
        )}
      </div>
    </Link>
  );
}
