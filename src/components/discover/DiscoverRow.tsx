import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function DiscoverRow({ title, subtitle, children }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="group/row relative">
      <div className="px-4 md:px-12 mb-2 md:mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-base md:text-xl font-bold tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="text-[11px] md:text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="relative">
        <button
          aria-label="Scroll left"
          onClick={() => scroll("left")}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-10 w-12 items-center justify-center bg-gradient-to-r from-background/95 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>

        <div
          ref={scrollerRef}
          className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide px-4 md:px-12 scroll-smooth snap-x"
        >
          {children}
        </div>

        <button
          aria-label="Scroll right"
          onClick={() => scroll("right")}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-10 w-12 items-center justify-center bg-gradient-to-l from-background/95 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-6 h-6 text-foreground" />
        </button>
      </div>
    </section>
  );
}
