import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { trackRecentProducer } from "@/components/social/RecentlyViewedProducers";

export default function ProducerCarousel() {
  const navigate = useNavigate();

  const { data: producers = [], isLoading } = useQuery({
    queryKey: ["producers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, producer_type")
        .eq("is_producer", true)
        .limit(20);
      return data || [];
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-20 h-24 rounded-xl flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (producers.length === 0) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-muted-foreground">No producers yet</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <h2 className="text-base font-semibold text-foreground mb-3">Featured Producers</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {producers.map((p: any) => (
          <button
            key={p.user_id}
            onClick={() => {
              trackRecentProducer(p.user_id);
              navigate(`/${p.username || p.user_id}`);
            }}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <Avatar className="w-16 h-16 border-2" style={{ borderColor: "#3D7CFF" }}>
              <AvatarImage src={p.avatar_url} />
              <AvatarFallback className="bg-muted text-foreground text-xs">
                {(p.display_name || "P").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground truncate max-w-[64px]">{p.display_name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              🎛️ {p.producer_type || "Producer"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
