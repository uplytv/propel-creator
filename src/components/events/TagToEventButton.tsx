import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tag, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GlobalEvent } from "./GlobalEventCard";

interface Props {
  creatorId: string;
  streamId?: string;
  videoId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
}

export function TagToEventButton({ creatorId, streamId, videoId, variant = "outline", size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      let q = supabase.from("events_global").select("*").order("date", { ascending: true }).limit(20);
      if (search) q = q.or(`title.ilike.%${search}%,artist_name.ilike.%${search}%`);
      else q = q.gte("date", new Date().toISOString());
      const { data } = await q;
      setResults((data as GlobalEvent[]) || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [search, open]);

  const tag = async (eventId: string) => {
    const { error } = await supabase.from("event_creator_tags").insert({
      event_id: eventId, creator_id: creatorId, stream_id: streamId || null, video_id: videoId || null,
    });
    if (error) { toast.error("Failed to tag event"); return; }
    toast.success("Tagged to event!");
    setOpen(false);
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Tag className="w-3 h-3 mr-1" /> Tag to Event
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Tag to a global event</DialogTitle></DialogHeader>
          <Input placeholder="Search events or artists..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="overflow-y-auto space-y-2 flex-1">
            {loading && <div className="text-sm text-muted-foreground p-4 text-center">Searching...</div>}
            {!loading && results.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">No events found</div>}
            {results.map((e) => (
              <button key={e.id} onClick={() => tag(e.id)} className="w-full text-left p-3 rounded-lg border border-border hover:border-primary bg-card transition flex gap-3">
                {e.image_url && <img src={e.image_url} alt={e.title} loading="lazy" className="w-14 h-14 rounded object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm line-clamp-1">{e.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3" />{e.date ? new Date(e.date).toLocaleDateString() : "TBA"}
                    {e.city && <><MapPin className="w-3 h-3 ml-1" />{e.city}</>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
