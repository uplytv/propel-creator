import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  eventId: string;
}

export function RsvpButton({ eventId }: Props) {
  const [loading, setLoading] = useState(true);
  const [going, setGoing] = useState(false);
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const sb = supabase;
      const [{ count: c }, mine] = await Promise.all([
        sb.from("event_rsvps").select("*", { count: "exact", head: true }).eq("event_id", eventId),
        user ? sb.from("event_rsvps").select("id").eq("event_id", eventId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setCount(c || 0);
      setGoing(!!(mine as any)?.data);
      setLoading(false);
    })();
  }, [eventId]);

  const toggle = async () => {
    if (!userId) {
      toast.error("Sign in to RSVP");
      return;
    }
    setLoading(true);
    const sb = supabase;
    if (going) {
      await sb.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
      setGoing(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      await sb.from("event_rsvps").insert({ event_id: eventId, user_id: userId, status: "going" });
      setGoing(true);
      setCount((c) => c + 1);
      toast.success("You're going! 🎉");
    }
    setLoading(false);
  };

  return (
    <Button onClick={toggle} disabled={loading} variant={going ? "secondary" : "default"} size="lg" className="w-full sm:w-auto">
      {going ? <Check className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
      {going ? "Going" : "I'm Going"}
      {count > 0 && <span className="ml-2 text-xs opacity-80">· {count}</span>}
    </Button>
  );
}
