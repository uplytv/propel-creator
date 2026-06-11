import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, CalendarClock, ChevronRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";

interface ScannableEvent {
  event_id: string;
  title: string;
  starts_at: string | null;
  role: string;
  gate: string | null;
}

export default function Scan() {
  const navigate = useNavigate();

  const { data: events, isLoading } = useQuery({
    queryKey: ["my-scannable-events"],
    queryFn: async () => {
      const { data } = await supabase.rpc("my_scannable_events");
      return ((data ?? []) as ScannableEvent[]).sort(
        (a, b) => new Date(b.starts_at ?? 0).getTime() - new Date(a.starts_at ?? 0).getTime(),
      );
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Scan Tickets · UPLY" description="Check attendees in at the door." />
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Scan Tickets</h1>
            <p className="text-sm text-muted-foreground">Events you can check people into</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : !events || events.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <CalendarClock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No events to scan yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              An organizer needs to add you as staff, or create your own event.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <button
                key={e.event_id}
                onClick={() => navigate(`/scan/${e.event_id}`)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.starts_at ? new Date(e.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "TBA"}
                    {" · "}
                    <span className="capitalize">{e.role}</span>
                    {e.gate ? ` · Gate ${e.gate}` : ""}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
