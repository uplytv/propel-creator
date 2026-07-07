import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export default function VenueSpecialsFeed() {
  const { data: specials = [], isLoading } = useQuery({
    queryKey: ["venue-specials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_posts")
        .select("*, profiles:user_id(display_name, avatar_url, username, producer_type)")
        .eq("post_type", "venue_special")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return null;

  if (specials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <span className="text-3xl mb-3">🍸</span>
        <p className="text-sm text-muted-foreground font-medium">No specials posted yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Producers can post happy hours and deals</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4">
      {specials.map((s: any) => (
        <div key={s.id} className="rounded-xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="w-8 h-8">
              <AvatarImage src={s.profiles?.avatar_url} />
              <AvatarFallback className="bg-muted text-foreground text-xs">
                {(s.profiles?.display_name || "V").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-sm font-semibold text-foreground">{s.profiles?.display_name}</span>
              <span className="text-xs text-muted-foreground ml-1">· {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          <p className="text-sm text-foreground/80">{s.content}</p>
        </div>
      ))}
    </div>
  );
}
