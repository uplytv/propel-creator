import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const KEY = "uply.recentProducers";

export function trackRecentProducer(userId: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    const next = [userId, ...arr.filter((id) => id !== userId)].slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export default function RecentlyViewedProducers() {
  const navigate = useNavigate();
  const ids = getRecent();

  const { data: profiles = [] } = useQuery({
    queryKey: ["recent-producers", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      // preserve original order
      const map = new Map((data || []).map((p: any) => [p.user_id, p]));
      return ids.map((id) => map.get(id)).filter(Boolean);
    },
    staleTime: 60_000,
  });

  if (profiles.length === 0) return null;

  return (
    <div className="px-4 pt-4">
      <h2 className="text-base font-bold text-foreground mb-3">Recently Viewed</h2>
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
        {profiles.map((p: any) => (
          <button
            key={p.user_id}
            onClick={() => navigate(`/${p.username || p.user_id}`)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16"
          >
            <Avatar className="w-14 h-14">
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-foreground text-xs">
                {(p.display_name || "U").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-semibold text-foreground/80 truncate w-full text-center">
              {p.display_name || "Producer"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
