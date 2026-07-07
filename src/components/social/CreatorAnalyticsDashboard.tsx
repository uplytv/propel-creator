import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { BarChart3, Eye, Users, Ticket, TrendingUp, Star } from "lucide-react";

export default function CreatorAnalyticsDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["creator-analytics", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [events, tickets, followers, stories, reviews] = await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }).eq("creator_id", user.id),
        supabase.from("tickets").select("amount_paid, creator_earnings").eq("creator_id", user.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("story_views").select("story_id").in(
          "story_id",
          (await supabase.from("stories").select("id").eq("user_id", user.id)).data?.map((s: any) => s.id) || []
        ),
        (supabase as any).from("event_reviews").select("rating").in( // cast: awaiting types regen (event_reviews)
          "event_id",
          (await supabase.from("events").select("id").eq("creator_id", user.id)).data?.map((e: any) => e.id) || []
        ),
      ]);

      const ticketData = tickets.data || [];
      const totalRevenue = ticketData.reduce((s: number, t: any) => s + (t.creator_earnings || 0), 0);
      const totalSold = ticketData.length;
      const reviewData = reviews.data || [];
      const avgRating = reviewData.length > 0
        ? (reviewData.reduce((s: number, r: any) => s + r.rating, 0) / reviewData.length).toFixed(1)
        : null;

      return {
        eventCount: events.count || 0,
        ticketsSold: totalSold,
        revenue: totalRevenue,
        followers: followers.count || 0,
        storyViews: stories.data?.length || 0,
        avgRating,
        reviewCount: reviewData.length,
      };
    },
    enabled: !!user,
    staleTime: 120_000,
  });

  if (isLoading || !stats) {
    return (
      <div className="px-4 py-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    { icon: Ticket, label: "Tickets Sold", value: stats.ticketsSold, color: "#3D7CFF" },
    { icon: TrendingUp, label: "Revenue", value: `$${stats.revenue.toFixed(0)}`, color: "#00E5FF" },
    { icon: Users, label: "Followers", value: stats.followers, color: "#FFD700" },
    { icon: Eye, label: "Story Views", value: stats.storyViews, color: "#FF6B35" },
    { icon: BarChart3, label: "Events Created", value: stats.eventCount, color: "#A855F7" },
    { icon: Star, label: "Avg Rating", value: stats.avgRating || "—", color: "#FFD700", sub: stats.reviewCount > 0 ? `${stats.reviewCount} reviews` : null },
  ];

  return (
    <div className="px-4 py-4">
      <h3 className="text-foreground font-bold text-base mb-3">Your Analytics</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-3"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <card.icon className="w-4 h-4 mb-2" style={{ color: card.color }} />
            <p className="text-foreground font-black text-xl">{card.value}</p>
            <p className="text-muted-foreground text-[11px] font-medium">{card.label}</p>
            {card.sub && <p className="text-muted-foreground/70 text-[10px]">{card.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
