import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, Radio, Film, Star, Zap, ShoppingBag, BookOpen } from "lucide-react";

interface MilestoneConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  check: (stats: any) => boolean;
  color: string;
}

const MILESTONES: MilestoneConfig[] = [
  { key: "first_stream", label: "First Stream", icon: Radio, check: (s) => s.streams > 0, color: "hsl(var(--destructive))" },
  { key: "first_post", label: "Community Starter", icon: Star, check: (s) => s.posts > 0, color: "hsl(var(--warning))" },
  { key: "10_members", label: "10 Members", icon: Users, check: (s) => s.members >= 10, color: "hsl(var(--primary))" },
  { key: "100_members", label: "100 Members", icon: Users, check: (s) => s.members >= 100, color: "hsl(195 100% 50%)" },
  { key: "first_product", label: "Merchant", icon: ShoppingBag, check: (s) => s.products > 0, color: "#FF69B4" },
  { key: "first_course", label: "Educator", icon: BookOpen, check: (s) => s.lessons > 0, color: "#9B59B6" },
  { key: "10_recordings", label: "Content Machine", icon: Film, check: (s) => s.recordings >= 10, color: "#E67E22" },
  { key: "1000_members", label: "1K Community", icon: Zap, check: (s) => s.members >= 1000, color: "hsl(var(--primary))" },
];

export default function CreatorMilestones({ creatorId }: { creatorId: string }) {
  const { data: stats } = useQuery({
    queryKey: ["creator-milestones", creatorId],
    queryFn: async () => {
      const [members, posts, streams, products, lessons, recordings] = await Promise.all([
        supabase.from("community_members").select("*", { count: "exact", head: true }).eq("creator_id", creatorId),
        supabase.from("community_posts").select("*", { count: "exact", head: true }).eq("creator_id", creatorId),
        supabase.from("mux_live_streams_public").select("*", { count: "exact", head: true }).eq("user_id", creatorId),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("user_id", creatorId).eq("status", "active"),
        supabase.from("classroom_lessons").select("*", { count: "exact", head: true }).eq("creator_id", creatorId),
        supabase.from("stream_recordings").select("*", { count: "exact", head: true }).eq("creator_id", creatorId).eq("is_published", true),
      ]);
      return {
        members: members.count || 0,
        posts: posts.count || 0,
        streams: streams.count || 0,
        products: products.count || 0,
        lessons: lessons.count || 0,
        recordings: recordings.count || 0,
      };
    },
    enabled: !!creatorId,
  });

  if (!stats) return null;

  const earned = MILESTONES.filter(m => m.check(stats));
  if (earned.length === 0) return null;

  return (
    <section className="max-w-[720px] mx-auto px-4 mb-6">
      <h2 className="text-foreground text-lg font-bold mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5" style={{ color: "hsl(var(--warning))" }} /> Milestones
      </h2>
      <div className="flex flex-wrap gap-2">
        {earned.map(m => {
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}30` }}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
            </div>
          );
        })}
      </div>
    </section>
  );
}
