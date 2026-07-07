import { useState, useEffect } from "react";
import { Ticket, Search, Plus, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface LinkEventToStreamProps {
  streamId: string;
  onEventLinked: (eventId: string, eventData: any) => void;
  onSkip: () => void;
}

export default function LinkEventToStream({ streamId, onEventLinked, onSkip }: LinkEventToStreamProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickForm, setQuickForm] = useState({ title: "", price: "", venue: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchEvents = async () => {
      setLoading(true);
      let query = supabase
        .from("events")
        .select("id, title, ticket_price, location_name, location_city, starts_at, capacity, tickets_sold, is_free, status")
        .eq("creator_id", user.id)
        .eq("status", "published")
        .order("starts_at", { ascending: true })
        .limit(20);

      if (search.trim()) {
        query = query.ilike("title", `%${search}%`);
      }

      const { data } = await query;
      setEvents(data || []);
      setLoading(false);
    };
    fetchEvents();
  }, [user, search]);

  const handleSelectEvent = async (event: any) => {
    try {
      await supabase
        .from("mux_live_streams")
        .update({ event_id: event.id, is_event_stream: true })
        .eq("id", streamId);
      onEventLinked(event.id, event);
      toast.success(`Linked to "${event.title}"`);
    } catch (err: any) {
      toast.error("Failed to link event");
    }
  };

  const handleQuickCreate = async () => {
    if (!user || !quickForm.title) return;
    setCreating(true);
    try {
      const now = new Date();
      const endsAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      const { data: newEvent, error } = await supabase
        .from("events")
        .insert({
          creator_id: user.id,
          title: quickForm.title,
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          ticket_price: quickForm.price ? parseFloat(quickForm.price) : 0,
          is_free: !quickForm.price || parseFloat(quickForm.price) === 0,
          location_name: quickForm.venue || null,
          status: "published",
          event_type: "in_person",
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("mux_live_streams")
        .update({ event_id: newEvent.id, is_event_stream: true })
        .eq("id", streamId);

      onEventLinked(newEvent.id, newEvent);
      toast.success(`Event "${quickForm.title}" created & linked!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Selling tickets on this stream?</span>
        </div>
        <button onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground">Skip</button>
      </div>

      {!showQuickCreate ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your events..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-3">Loading...</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No events found</p>
            ) : (
              events.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => handleSelectEvent(evt)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/60 transition-colors text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{evt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {evt.location_name || "Virtual"} · {evt.is_free ? "Free" : `$${evt.ticket_price}`}
                    </p>
                  </div>
                  <Ticket className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-2" />
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => setShowQuickCreate(true)}
            className="flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Create Event Quick
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Quick Event</span>
            <button onClick={() => setShowQuickCreate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <Input
            value={quickForm.title}
            onChange={(e) => setQuickForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Event name"
            className="h-9 text-sm"
          />
          <div className="flex gap-2">
            <Input
              value={quickForm.price}
              onChange={(e) => setQuickForm(f => ({ ...f, price: e.target.value }))}
              placeholder="Price ($)"
              type="number"
              className="h-9 text-sm flex-1"
            />
            <Input
              value={quickForm.venue}
              onChange={(e) => setQuickForm(f => ({ ...f, venue: e.target.value }))}
              placeholder="Venue name"
              className="h-9 text-sm flex-1"
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={!quickForm.title || creating}
            onClick={handleQuickCreate}
          >
            {creating ? "Creating..." : "Create & Link Event"}
          </Button>
        </div>
      )}
    </div>
  );
}
