import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flame } from "lucide-react";

interface EventHypeMeterProps {
  eventId: string;
  compact?: boolean;
}

export default function EventHypeMeter({ eventId, compact }: EventHypeMeterProps) {
  const { data: counts } = useQuery({
    queryKey: ["event-hype", eventId],
    queryFn: async () => {
      const [going, maybe, stories] = await Promise.all([
        (supabase as any).from("attendance").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "going"),
        (supabase as any).from("attendance").select("*", { count: "exact", head: true }).eq("event_id", eventId).eq("status", "maybe"),
        (supabase as any).from("stories").select("*", { count: "exact", head: true }).eq("event_id", eventId),
      ]);
      return {
        going: going.count || 0,
        maybe: maybe.count || 0,
        stories: stories.count || 0,
      };
    },
    staleTime: 60_000,
  });

  if (!counts) return null;

  const total = counts.going + counts.maybe;
  const hypeLevel = total >= 50 ? 4 : total >= 20 ? 3 : total >= 10 ? 2 : total >= 3 ? 1 : 0;
  const hypeLabels = ["", "Building", "Heating Up", "🔥 Hot", "🔥🔥 Packed"];
  const hypeColors = ["", "#FFD700", "#FF8C00", "#FF6347", "#FF3B30"];

  if (hypeLevel === 0) return null;

  if (compact) {
    return (
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: `${hypeColors[hypeLevel]}22`, color: hypeColors[hypeLevel] }}
      >
        {hypeLabels[hypeLevel]}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame className="w-3.5 h-3.5" style={{ color: hypeColors[hypeLevel] }} />
          <span className="text-xs font-bold" style={{ color: hypeColors[hypeLevel] }}>
            {hypeLabels[hypeLevel]}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (hypeLevel / 4) * 100)}%`,
              background: `linear-gradient(90deg, #3D7CFF, ${hypeColors[hypeLevel]})`,
            }}
          />
        </div>
      </div>
      <div className="text-right">
        <p className="text-foreground text-xs font-bold">{counts.going}</p>
        <p className="text-muted-foreground text-[10px]">going</p>
      </div>
    </div>
  );
}
