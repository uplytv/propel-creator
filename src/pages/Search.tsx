import { useEffect, useRef, useState } from "react";
import { Search as SearchIcon, X, Users, Package, Radio, Film, Briefcase, Loader2, Music, Disc3, Mic2, FileText, Globe, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { useSearch, SearchResult } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BackNav from "@/components/BackNav";
import { Skeleton } from "@/components/ui/skeleton";
import FestivalsSection from "@/components/social/FestivalsSection";
import CuratedFollowButton from "@/components/CuratedFollowButton";

const typeIcon: Record<string, typeof Users> = {
  creator: Users,
  product: Package,
  stream: Radio,
  recording: Film,
  job: Briefcase,
  track: Music,
  album: Disc3,
  artist: Mic2,
  page: Globe,
  blog: FileText,
};

const typeLabel: Record<string, string> = {
  creator: "Creator",
  product: "Product",
  stream: "Stream",
  recording: "Recording",
  job: "Job",
  track: "Track",
  album: "Album",
  artist: "Artist",
  page: "Page",
  blog: "Article",
};

const filterOptions = [
  { value: "all", label: "All" },
  { value: "artist", label: "Artists" },
  { value: "creator", label: "Creators" },
  { value: "blog", label: "Articles" },
  { value: "page", label: "Pages" },
  { value: "track", label: "Tracks" },
  { value: "album", label: "Albums" },
  { value: "product", label: "Products" },
  { value: "stream", label: "Streams" },
  { value: "recording", label: "Recordings" },
  { value: "job", label: "Jobs" },
] as const;

type FilterType = typeof filterOptions[number]["value"];

export default function SearchPage() {
  const { query, search, results, loading } = useSearch();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = (val: string) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.link);
  };

  // Apply filter
  const filtered = activeFilter === "all" ? results : results.filter(r => r.type === activeFilter);

  // Group results by type
  const grouped = filtered.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  // Count per type for filter badges
  const typeCounts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        <BackNav label="Search" />

        <div className="relative mt-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search creators, products, streams, jobs..."
            className="pl-10 pr-10 h-12 text-base bg-card border-border rounded-xl"
            defaultValue={query}
            onChange={(e) => handleChange(e.target.value)}
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />}
        </div>

        {/* Type filter chips */}
        {results.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {filterOptions.map(opt => {
              const count = opt.value === "all" ? results.length : (typeCounts[opt.value] || 0);
              if (opt.value !== "all" && count === 0) return null;
              return (
                <button
                  key={opt.value}
                  onClick={() => setActiveFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                    activeFilter === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card/60 text-muted-foreground border-border hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                  <span className={`text-[10px] ${activeFilter === opt.value ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && query.length >= 2 && results.length === 0 && (
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = typeIcon[type] || SearchIcon;
            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6"
              >
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {typeLabel[type]}s
                  </span>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left"
                    >
                      {item.image ? (
                        <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate inline-flex items-center gap-1">
                          <span className="truncate">{item.title}</span>
                          {item.verified && (
                            <BadgeCheck
                              className="w-4 h-4 text-primary shrink-0 fill-primary/20"
                              aria-label="Verified artist"
                            />
                          )}
                        </p>
                        {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
                      </div>
                      {item.followKey && (
                        <CuratedFollowButton
                          followKey={item.followKey}
                          displayName={item.title}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {query.length < 2 && (
          <>
            <FestivalsSection />
            <div className="text-center py-10 text-muted-foreground">
              <SearchIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs">Type at least 2 characters to search</p>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
