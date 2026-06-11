import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, Star, Users, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface FeaturedItem {
  id: string;
  type: "creator" | "community" | "course";
  title: string;
  subtitle: string;
  imageUrl: string | null;
  avatarUrl: string | null;
  userId: string;
  stat: string;
}

export default function FeaturedCarousel() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: featured, isLoading } = useQuery({
    queryKey: ["featured-picks"],
    queryFn: async () => {
      const items: FeaturedItem[] = [];

      const [creatorsRes, spacesRes, productsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, bio, members")
          .not("display_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("creator_spaces")
          .select("id, creator_id, name, description, cover_image_url, avatar_url")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("products_public")
          .select("id, user_id, name, description, image_url, type")
          .in("type", ["course", "community"])
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      if (creatorsRes.data) {
        for (const c of creatorsRes.data) {
          items.push({
            id: c.user_id,
            type: "creator",
            title: c.display_name || "Creator",
            subtitle: c.bio?.slice(0, 60) || "Top creator on the platform",
            imageUrl: c.avatar_url,
            avatarUrl: c.avatar_url,
            userId: c.user_id,
            stat: `${c.members || 0} members`,
          });
        }
      }

      if (spacesRes.data) {
        for (const s of spacesRes.data) {
          items.push({
            id: s.id,
            type: "community",
            title: s.name,
            subtitle: s.description?.slice(0, 60) || "Join this community",
            imageUrl: s.cover_image_url,
            avatarUrl: s.avatar_url,
            userId: s.creator_id,
            stat: "Community",
          });
        }
      }

      if (productsRes.data) {
        for (const p of productsRes.data as any[]) {
          items.push({
            id: p.id,
            type: p.type === "course" ? "course" : "community",
            title: p.name,
            subtitle: p.description?.slice(0, 60) || "",
            imageUrl: p.image_url,
            avatarUrl: null,
            userId: p.user_id,
            stat: "Popular",
          });
        }
      }

      // Interleave types for variety, take top 8
      const byType = { creator: [] as FeaturedItem[], community: [] as FeaturedItem[], course: [] as FeaturedItem[] };
      items.forEach((i) => byType[i.type]?.push(i));
      const interleaved: FeaturedItem[] = [];
      const maxLen = Math.max(...Object.values(byType).map((a) => a.length));
      for (let i = 0; i < maxLen; i++) {
        if (byType.creator[i]) interleaved.push(byType.creator[i]);
        if (byType.community[i]) interleaved.push(byType.community[i]);
        if (byType.course[i]) interleaved.push(byType.course[i]);
      }
      return interleaved.slice(0, 10);
    },
    staleTime: 60000,
  });

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  const handleClick = (item: FeaturedItem) => {
    if (item.type === "creator") {
      navigate(`/creator/${encodeURIComponent(item.title)}`);
    } else if (item.type === "course") {
      navigate(`/community/${item.userId}/classroom`);
    } else {
      navigate(`/community/${item.userId}/community`);
    }
  };

  const typeIcon = { creator: Star, community: Users, course: BookOpen };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted animate-pulse" />
          <div className="w-24 h-4 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[200px] rounded-xl bg-muted animate-pulse aspect-[3/4]" />
          ))}
        </div>
      </div>
    );
  }

  if (!featured || featured.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold tracking-tight text-foreground">Staff Picks</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scroll("left")} aria-label="Scroll left">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scroll("right")} aria-label="Scroll right">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {featured.map((item, i) => {
          const Icon = typeIcon[item.type];
          return (
            <motion.div
              key={`${item.type}-${item.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => handleClick(item)}
              className="shrink-0 w-[160px] snap-start cursor-pointer group"
            >
              <div className="relative rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-all duration-300">
                {/* Image */}
                <div className="aspect-[3/4] relative overflow-hidden bg-secondary">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      width={300}
                      height={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary/30" />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />

                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-[9px] font-bold uppercase tracking-wider">
                      <Icon className="w-2.5 h-2.5" />
                      {item.type}
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5 space-y-1">
                    <h3 className="text-xs font-bold leading-tight line-clamp-2 text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {item.stat}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
