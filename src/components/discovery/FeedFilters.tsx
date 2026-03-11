import { motion } from "framer-motion";
import { Radio, Users, BookOpen, Briefcase, Star, Flame, Clock, TrendingUp, ArrowUpDown, Zap } from "lucide-react";
import { type FilterCategory, type SortOption } from "@/hooks/useDiscoveryFeed";
import { Switch } from "@/components/ui/switch";

const categories: { value: FilterCategory; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Flame },
  { value: "livestream", label: "Live", icon: Radio },
  { value: "community", label: "Communities", icon: Users },
  { value: "course", label: "Courses", icon: BookOpen },
  { value: "service", label: "Services", icon: Briefcase },
  { value: "creator", label: "Creators", icon: Star },
];

const sorts: { value: SortOption; label: string; icon: React.ElementType }[] = [
  { value: "trending", label: "Trending", icon: Flame },
  { value: "newest", label: "New", icon: Clock },
  { value: "popular", label: "Popular", icon: TrendingUp },
  { value: "price_low", label: "Price ↑", icon: ArrowUpDown },
  { value: "price_high", label: "Price ↓", icon: ArrowUpDown },
];

interface Props {
  filter: FilterCategory;
  sort: SortOption;
  liveOnly: boolean;
  onFilterChange: (f: FilterCategory) => void;
  onSortChange: (s: SortOption) => void;
  onLiveOnlyChange: (v: boolean) => void;
}

export default function FeedFilters({ filter, sort, liveOnly, onFilterChange, onSortChange, onLiveOnlyChange }: Props) {
  return (
    <div className="space-y-3">
      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => {
          const active = filter === cat.value;
          const Icon = cat.icon;
          return (
            <motion.button
              key={cat.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFilterChange(cat.value)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-[var(--glow-shadow)]"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </motion.button>
          );
        })}
      </div>

      {/* Sort + Live toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {sorts.map((s) => {
            const active = sort === s.value;
            return (
              <button
                key={s.value}
                onClick={() => onSortChange(s.value)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  active
                    ? "bg-accent/20 text-accent-foreground border border-accent/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <label className="shrink-0 flex items-center gap-1.5 cursor-pointer">
          <Zap className={`w-3.5 h-3.5 ${liveOnly ? "text-destructive" : "text-muted-foreground"}`} />
          <span className="text-[11px] font-medium text-muted-foreground">Live</span>
          <Switch checked={liveOnly} onCheckedChange={onLiveOnlyChange} className="scale-75" />
        </label>
      </div>
    </div>
  );
}
