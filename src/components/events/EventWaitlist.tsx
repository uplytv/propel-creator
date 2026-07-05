import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function EventWaitlist({ eventId }: { eventId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ["event-waitlist-count", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("event_waitlist_count", { p_event_id: eventId });
      return Number(data ?? 0);
    },
  });

  const { data: joined = false } = useQuery({
    queryKey: ["event-waitlist-joined", eventId, user?.id],
    enabled: !!eventId && !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("is_on_event_waitlist", { p_event_id: eventId });
      return !!data;
    },
  });

  const join = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("join_event_waitlist", { p_event_id: eventId, p_email: user?.email ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You're on the waitlist — we'll email you if tickets open up.");
      qc.invalidateQueries({ queryKey: ["event-waitlist-count", eventId] });
      qc.invalidateQueries({ queryKey: ["event-waitlist-joined", eventId] });
    },
    onError: (e: any) => toast.error(e?.message || "Couldn't join the waitlist"),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-foreground">Sold out</p>
          <p className="text-xs text-muted-foreground">
            {count > 0 ? `${count.toLocaleString()} waiting · ` : ""}Join the waitlist to get notified if tickets open up.
          </p>
        </div>
        {joined ? (
          <Button variant="outline" disabled className="gap-2 shrink-0">
            <Check className="w-4 h-4" /> On waitlist
          </Button>
        ) : (
          <Button
            onClick={() => (user ? join.mutate() : toast.error("Sign in to join the waitlist"))}
            disabled={join.isPending}
            className="gap-2 shrink-0"
          >
            {join.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />} Join waitlist
          </Button>
        )}
      </div>
    </div>
  );
}
