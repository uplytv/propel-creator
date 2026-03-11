import { motion } from "framer-motion";
import { Radio, Users, BookOpen, Briefcase, Star, TrendingUp, Zap, GraduationCap, Handshake } from "lucide-react";
import { type FilterCategory } from "@/hooks/useDiscoveryFeed";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CategoryConfig {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  accentClass: string;
}

const categoryConfigs: Record<Exclude<FilterCategory, "all">, CategoryConfig> = {
  livestream: {
    title: "Live Now",
    subtitle: "Watch creators broadcast in real time",
    icon: Radio,
    gradient: "from-red-500/20 via-orange-500/10 to-transparent",
    accentClass: "text-red-400",
  },
  community: {
    title: "Communities",
    subtitle: "Join like-minded creators & grow together",
    icon: Users,
    gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
    accentClass: "text-blue-400",
  },
  course: {
    title: "Courses",
    subtitle: "Level up with expert-led lessons",
    icon: GraduationCap,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accentClass: "text-emerald-400",
  },
  service: {
    title: "Services",
    subtitle: "Hire vetted talent for your next project",
    icon: Handshake,
    gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
    accentClass: "text-amber-400",
  },
  creator: {
    title: "Creators",
    subtitle: "Discover top creators on the platform",
    icon: Star,
    gradient: "from-purple-500/20 via-fuchsia-500/10 to-transparent",
    accentClass: "text-purple-400",
  },
};

function useHeroStats(category: Exclude<FilterCategory, "all">) {
  return useQuery({
    queryKey: ["hero-stats", category],
    queryFn: async () => {
      switch (category) {
        case "livestream": {
          const { count } = await supabase
            .from("mux_live_streams")
            .select("*", { count: "exact", head: true })
            .in("status", ["active", "live"]);
          return [
            { label: "Live now", value: count ?? 0 },
          ];
        }
        case "community": {
          const { count: spaces } = await supabase
            .from("creator_spaces")
            .select("*", { count: "exact", head: true });
          const { count: members } = await supabase
            .from("community_members")
            .select("*", { count: "exact", head: true });
          return [
            { label: "Communities", value: spaces ?? 0 },
            { label: "Members", value: members ?? 0 },
          ];
        }
        case "course": {
          const { count: modules } = await supabase
            .from("classroom_modules")
            .select("*", { count: "exact", head: true });
          const { count: lessons } = await supabase
            .from("classroom_lessons")
            .select("*", { count: "exact", head: true });
          return [
            { label: "Modules", value: modules ?? 0 },
            { label: "Lessons", value: lessons ?? 0 },
          ];
        }
        case "service": {
          const { count: products } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("type", "service")
            .eq("status", "active");
          return [
            { label: "Services", value: products ?? 0 },
          ];
        }
        case "creator": {
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true });
          return [
            { label: "Creators", value: count ?? 0 },
          ];
        }
      }
    },
    staleTime: 60_000,
  });
}

export default function CategoryHeroBanner({ category }: { category: Exclude<FilterCategory, "all"> }) {
  const config = categoryConfigs[category];
  const { data: stats } = useHeroStats(category);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative overflow-hidden rounded-2xl border border-border bg-card`}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} pointer-events-none`} />

      <div className="relative flex items-center gap-4 p-4">
        {/* Icon */}
        <div className={`shrink-0 w-12 h-12 rounded-xl bg-secondary/60 flex items-center justify-center ${config.accentClass}`}>
          <Icon className="w-6 h-6" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold tracking-tight text-foreground">{config.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
        </div>
      </div>

      {/* Stats bar */}
      {stats && stats.length > 0 && (
        <div className="relative border-t border-border/50 px-4 py-2.5 flex gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-sm font-bold text-foreground">{stat.value.toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
