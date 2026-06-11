import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Ticket, ArrowLeft, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { GlobalEvent } from "@/components/events/GlobalEventCard";
import { RsvpButton } from "@/components/events/RsvpButton";
import { EventSeo } from "@/components/events/EventSeo";

interface CreatorTag {
  id: string;
  creator_id: string;
  stream_id: string | null;
  video_id: string | null;
  profile?: { username: string | null; display_name: string | null; avatar_url: string | null };
}

export default function GlobalEventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<GlobalEvent | null>(null);
  const [tags, setTags] = useState<CreatorTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data: ev } = await supabase.from("events_global").select("*").eq("id", eventId).maybeSingle();
      setEvent(ev as GlobalEvent | null);

      const { data: tagData } = await supabase
        .from("event_creator_tags")
        .select("id, creator_id, stream_id, video_id")
        .eq("event_id", eventId);

      if (tagData && tagData.length > 0) {
        const creatorIds = [...new Set(tagData.map((t: any) => t.creator_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", creatorIds);
        const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        setTags(tagData.map((t: any) => ({ ...t, profile: map.get(t.creator_id) })));
      }
      setLoading(false);
    })();
  }, [eventId]);

  if (loading) return <div className="container py-6 space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-8 w-2/3" /></div>;
  if (!event) return <div className="container py-12 text-center text-muted-foreground">Event not found.</div>;

  const dateStr = event.date ? new Date(event.date).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }) : "TBA";

  return (
    <div className="min-h-screen bg-background">
      <div className="relative aspect-video sm:aspect-[3/1] bg-muted overflow-hidden">
        {event.image_url && <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" loading="eager" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <Button asChild variant="ghost" size="sm" className="absolute top-4 left-4 bg-background/80 backdrop-blur">
          <Link to="/events"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Link>
        </Button>
      </div>

      <div className="container max-w-4xl py-6 space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {event.is_persian && <Badge className="bg-primary text-primary-foreground">🇮🇷 Persian Event</Badge>}
            {event.category && <Badge variant="secondary" className="capitalize">{event.category}</Badge>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">{event.title}</h1>
          {event.artist_name && <p className="text-lg text-muted-foreground">{event.artist_name}</p>}
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {dateStr}</div>
            {(event.venue || event.city) && (
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {[event.venue, event.city, event.country].filter(Boolean).join(", ")}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <RsvpButton eventId={event.id} />
            {((event as any).affiliate_url || event.ticket_url) && (
              <Button asChild size="lg" variant="outline">
                <a href={(event as any).affiliate_url || event.ticket_url} target="_blank" rel="noopener noreferrer">
                  <Ticket className="w-4 h-4 mr-2" /> Get Tickets
                </a>
              </Button>
            )}
          </div>
        </div>
        <EventSeo event={event} />

        <div className="border-t border-border pt-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" /> UPLY Creators at this Event
          </h2>
          {tags.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No creators have tagged this event yet. Be the first — go live or tag a video to this event.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tags.map((t) => (
                <Link key={t.id} to={t.profile?.username ? `/${t.profile.username}` : "#"} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition">
                  {t.profile?.avatar_url && <img src={t.profile.avatar_url} alt={t.profile.display_name || t.profile.username || ""} className="w-10 h-10 rounded-full object-cover" loading="lazy" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.profile?.display_name || t.profile?.username || "Creator"}</div>
                    <div className="text-xs text-muted-foreground">{t.stream_id ? "Live stream" : "Video"}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
