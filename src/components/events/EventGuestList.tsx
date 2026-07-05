import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Guest = { user_id: string; display_name: string | null; avatar_url: string | null };

export default function EventGuestList({ eventId, totalGoing }: { eventId: string; totalGoing: number }) {
  const { data: guests = [] } = useQuery({
    queryKey: ["event-guest-list", eventId],
    enabled: !!eventId && totalGoing > 0,
    queryFn: async (): Promise<Guest[]> => {
      const { data } = await (supabase as any).rpc("event_guest_list", { p_event_id: eventId, p_limit: 8 });
      return (data ?? []) as Guest[];
    },
  });

  if (totalGoing <= 0) return null;
  const extra = totalGoing - guests.length;

  return (
    <div className="flex items-center gap-3">
      {guests.length > 0 && (
        <div className="flex -space-x-2">
          {guests.map((g) =>
            g.avatar_url ? (
              <img
                key={g.user_id}
                src={g.avatar_url}
                alt={g.display_name || ""}
                loading="lazy"
                className="w-8 h-8 rounded-full border-2 border-background object-cover"
              />
            ) : (
              <div
                key={g.user_id}
                className="w-8 h-8 rounded-full border-2 border-background bg-primary/15 text-primary flex items-center justify-center text-xs font-bold"
              >
                {(g.display_name || "M").charAt(0).toUpperCase()}
              </div>
            ),
          )}
          {extra > 0 && (
            <div className="w-8 h-8 rounded-full border-2 border-background bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
              +{extra}
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Users className="w-4 h-4" />
        <span className="font-semibold text-foreground">{totalGoing.toLocaleString()}</span> {totalGoing === 1 ? "person" : "people"} going
      </p>
    </div>
  );
}
