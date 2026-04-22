import { useNavigate } from "react-router-dom";
import { useDiscoverStories } from "@/hooks/useDiscoverStories";

export default function DiscoverStoriesRail() {
  const navigate = useNavigate();
  const { data: stories = [], isLoading } = useDiscoverStories();

  if (isLoading || stories.length === 0) return null;

  return (
    <div className="px-4 md:px-8 pt-2">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {stories.map((s) => (
          <button
            key={s.id}
            onClick={() => s.link_url && navigate(s.link_url)}
            className="group relative shrink-0 w-[88px] h-[88px] md:w-[100px] md:h-[100px] rounded-full overflow-hidden ring-2 ring-primary/60 ring-offset-2 ring-offset-background hover:ring-primary transition-all"
            aria-label={s.title}
          >
            <img
              src={s.image_url}
              alt={s.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <span className="absolute bottom-1.5 left-0 right-0 px-1 text-[10px] font-bold text-white text-center leading-tight line-clamp-2">
              {s.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
