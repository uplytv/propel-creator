import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, X } from "lucide-react";

// "Are you live from a tagged event tonight?" nudge for BroadcastStudio.
// Shows tonight's nearest event the creator could tag their stream to.
export function EventNudge() {
  const [event, setEvent] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("event_nudge_dismissed") === "1") {
      setDismissed(true);
      return;
    }
    (async () => {
      const start = new Date();
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const { data } = await supabase
        .from("events_global")
        .select("id, title, city, country, date, image_url")
        .gte("date", start.toISOString())
        .lte("date", end.toISOString())
        .order("date", { ascending: true })
        .limit(1);
      if (data && data[0]) setEvent(data[0]);
    })();
  }, []);

  if (!event || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem("event_nudge_dismissed", "1");
    setDismissed(true);
  };

  return (
    <Card className="p-3 bg-primary/5 border-primary/20 relative">
      <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
      <div className="flex gap-3 pr-6">
        {event.image_url && <img src={event.image_url} alt={event.title} loading="lazy" className="w-14 h-14 rounded object-cover shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-xs text-primary font-medium">Going live tonight?</div>
          <div className="text-sm font-semibold line-clamp-1">{event.title}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
            <Calendar className="w-3 h-3" />
            {new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            {event.city && <><MapPin className="w-3 h-3" />{event.city}</>}
          </div>
          <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
            <Link to={`/events/global/${event.id}`}>Tag stream to event →</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
