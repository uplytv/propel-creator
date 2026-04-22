import { useRef, useState, useEffect, ReactNode } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface RowProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  seeAllHref?: string;
}

export default function Row({ title, subtitle, children, seeAllHref = "#" }: RowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 8);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div
      className="group/row relative px-4 lg:px-12"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-white text-[18px] leading-tight font-bold tracking-tight">
              {title}
            </h2>
            <ChevronRight
              className={`w-4 h-4 text-[#00FF85] transition-opacity duration-300 ${
                hovered ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
          {subtitle && (
            <p className="text-[#888] text-[12px] mt-0.5">{subtitle}</p>
          )}
        </div>
        <a
          href={seeAllHref}
          className="text-white/60 hover:text-white text-xs font-medium transition cursor-pointer whitespace-nowrap"
        >
          See all →
        </a>
      </div>

      {/* Scroller wrapper */}
      <div className="relative">
        {/* Left button */}
        {canLeft && (
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className={`hidden md:flex absolute left-0 top-0 bottom-2 z-20 w-12 items-center justify-center bg-gradient-to-r from-[#0A0A0A] to-transparent transition-opacity duration-300 cursor-pointer ${
              hovered ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronLeft className="w-7 h-7 text-white" />
          </button>
        )}

        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory pr-8"
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            scrollPaddingLeft: "16px",
          }}
        >
          {children}
        </div>

        {/* Right button */}
        {canRight && (
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className={`hidden md:flex absolute right-0 top-0 bottom-2 z-20 w-12 items-center justify-center bg-gradient-to-l from-[#0A0A0A] to-transparent transition-opacity duration-300 cursor-pointer ${
              hovered ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronRight className="w-7 h-7 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
