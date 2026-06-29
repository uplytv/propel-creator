import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Newspaper,
  Music2,
  GraduationCap,
  Film,
  Radio,
  CalendarDays,
  Users,
} from "lucide-react";
import { useRef } from "react";
import portraitAsset from "@/assets/arya-xo-portrait-v3.jpg.asset.json";
import bandsCoverAsset from "@/assets/150bands-cover.jpg.asset.json";
import getdownAsset from "@/assets/getdown-cover.jpg.asset.json";
import aryaBgAsset from "@/assets/arya-xo-bg.png.asset.json";

/**
 * Netflix / Hulu-style horizontal category rails. Compact poster-shaped
 * cards that swipe horizontally, organized by category so every surface on
 * UPLY (artists, courses, videos, blogs, live, events, communities) gets
 * a discoverable home on the landing + discover screens.
 *
 * Curated, hand-picked items today (Arya XO launch). Swap to live data
 * sources later by replacing the RAILS array.
 */

type Aspect = "poster" | "wide" | "square";

interface RailItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  href: string;
  badge?: string;
  verified?: boolean;
}

interface Rail {
  id: string;
  title: string;
  icon: React.ElementType;
  aspect: Aspect;
  items: RailItem[];
}

const aryaImg = portraitAsset.url;
const bandsImg = bandsCoverAsset.url;
const getdownImg = getdownAsset.url;
const aryaBg = aryaBgAsset.url;

const RAILS: Rail[] = [
  {
    id: "featured",
    title: "Featured on UPLY",
    icon: BadgeCheck,
    aspect: "wide",
    items: [
      {
        id: "arya-feature",
        title: "Twenty-two, writing his own lane",
        subtitle: "The Come-Up · 8 min read",
        image: aryaBg,
        href: "/arya-xo/blog",
        badge: "New",
        verified: true,
      },
      {
        id: "arya-150",
        title: "150 Bands",
        subtitle: "HUGEL × NBA YoungBoy × Arya XO",
        image: bandsImg,
        href: "/arya-xo/blog/150-bands",
        badge: "Drop",
      },
      {
        id: "arya-site",
        title: "Arya XO — Official Site",
        subtitle: "Bookings & press",
        image: getdownImg,
        href: "/arya-xo-site",
      },
    ],
  },
  {
    id: "artists",
    title: "Artists",
    icon: Music2,
    aspect: "poster",
    items: [
      {
        id: "arya-artist",
        title: "Arya XO",
        subtitle: "Las Vegas · Verified",
        image: aryaImg,
        href: "/arya-xo",
        verified: true,
      },
      {
        id: "arya-links",
        title: "Arya XO — Links",
        subtitle: "Every link in one place",
        image: portraitAsset.url,
        href: "/arya-xo",
      },
    ],
  },
  {
    id: "courses",
    title: "Courses",
    icon: GraduationCap,
    aspect: "wide",
    items: [
      {
        id: "discover-courses",
        title: "Browse all courses",
        subtitle: "Learn from working creators",
        image: getdownImg,
        href: "/discover?cat=courses",
      },
      {
        id: "classroom",
        title: "Classroom",
        subtitle: "Cohort-style lessons",
        image: bandsImg,
        href: "/classroom",
      },
    ],
  },
  {
    id: "videos",
    title: "Videos",
    icon: Film,
    aspect: "wide",
    items: [
      {
        id: "discover-videos",
        title: "All videos",
        subtitle: "From the network",
        image: aryaBg,
        href: "/discover?cat=videos",
      },
      {
        id: "tv",
        title: "UPLY TV",
        subtitle: "Tonight on UPLY",
        image: getdownImg,
        href: "/tv",
      },
      {
        id: "shorts",
        title: "Shorts",
        subtitle: "Quick clips",
        image: bandsImg,
        href: "/discover?cat=shorts",
      },
    ],
  },
  {
    id: "blogs",
    title: "Blogs & Stories",
    icon: Newspaper,
    aspect: "wide",
    items: [
      {
        id: "arya-blog",
        title: "Twenty-two, writing his own lane",
        subtitle: "The Come-Up · Feature",
        image: aryaBg,
        href: "/arya-xo/blog",
      },
      {
        id: "arya-150-blog",
        title: "Inside 150 Bands",
        subtitle: "Track breakdown",
        image: bandsImg,
        href: "/arya-xo/blog/150-bands",
      },
    ],
  },
  {
    id: "live",
    title: "Live Right Now",
    icon: Radio,
    aspect: "wide",
    items: [
      {
        id: "live-feed",
        title: "What's live",
        subtitle: "Jump in",
        image: aryaBg,
        href: "/discover?cat=live",
      },
    ],
  },
  {
    id: "events",
    title: "Events",
    icon: CalendarDays,
    aspect: "wide",
    items: [
      {
        id: "events-feed",
        title: "Upcoming events",
        subtitle: "Tickets & RSVPs",
        image: getdownImg,
        href: "/discover?cat=events",
      },
    ],
  },
  {
    id: "communities",
    title: "Communities",
    icon: Users,
    aspect: "poster",
    items: [
      {
        id: "communities-feed",
        title: "Find your people",
        subtitle: "Join a community",
        image: aryaImg,
        href: "/discover?cat=communities",
      },
    ],
  },
];

function aspectClasses(a: Aspect) {
  switch (a) {
    case "poster":
      return "aspect-[2/3] w-[140px] sm:w-[160px]";
    case "square":
      return "aspect-square w-[160px] sm:w-[180px]";
    case "wide":
    default:
      return "aspect-video w-[240px] sm:w-[280px]";
  }
}

function RailRow({ rail }: { rail: Rail }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const Icon = rail.icon;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section aria-labelledby={`rail-${rail.id}`} className="group/rail relative">
      <div className="flex items-center justify-between px-4 sm:px-6 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" aria-hidden />
          <h2
            id={`rail-${rail.id}`}
            className="text-sm sm:text-base font-bold text-foreground tracking-tight"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            {rail.title}
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-1">
          <button
            type="button"
            aria-label={`Scroll ${rail.title} left`}
            onClick={() => scrollBy(-1)}
            className="p-1.5 rounded-full bg-card/60 hover:bg-card border border-border opacity-0 group-hover/rail:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${rail.title} right`}
            onClick={() => scrollBy(1)}
            className="p-1.5 rounded-full bg-card/60 hover:bg-card border border-border opacity-0 group-hover/rail:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 sm:px-6 pb-3 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rail.items.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            aria-label={item.title}
            className="group/card snap-start shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          >
            <div
              className={`relative ${aspectClasses(rail.aspect)} overflow-hidden rounded-lg border border-border bg-card/40 transition-transform duration-200 group-hover/card:scale-[1.03]`}
            >
              <img
                src={item.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 size-full object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-transparent"
              />
              {item.badge && (
                <span className="absolute top-2 left-2 inline-flex items-center rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  {item.badge}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="text-[12px] sm:text-[13px] font-semibold text-foreground leading-tight line-clamp-2">
                  {item.title}
                  {item.verified && (
                    <BadgeCheck className="inline-block w-3 h-3 ml-1 text-primary align-text-bottom" />
                  )}
                </p>
                {item.subtitle && (
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground line-clamp-1">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

interface Props {
  variant?: "landing" | "feed";
  className?: string;
}

export default function FeaturedRails({ variant = "landing", className = "" }: Props) {
  const isFeed = variant === "feed";
  return (
    <div
      className={`${isFeed ? "py-3" : "py-6 sm:py-8"} space-y-5 sm:space-y-6 ${className}`}
      aria-label="Featured on UPLY"
    >
      {RAILS.map((rail) => (
        <RailRow key={rail.id} rail={rail} />
      ))}
    </div>
  );
}

export { RAILS as FEATURED_RAILS };
