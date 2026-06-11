import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CalendarDays, MapPin, Clock, Users, Mail, Check, Loader2, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

export default function EventRSVP() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rsvpDone, setRsvpDone] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", eventId).single();
      if (ev) {
        setEvent(ev);
        const { data: p } = await supabase.from("profiles").select("display_name, avatar_url, username").eq("user_id", ev.creator_id).single();
        setCreator(p);
      }
      setLoading(false);
    })();
  }, [eventId]);

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !eventId) return;
    setSubmitting(true);

    try {
      // Insert RSVP
      const { error: rsvpErr } = await supabase.from("event_rsvps").upsert(
        {
          event_id: eventId,
          email: email.trim().toLowerCase(),
          name: name.trim() || null,
          user_id: user?.id || null,
        },
        { onConflict: "event_id,email" }
      );
      if (rsvpErr) throw rsvpErr;

      // Also add to creator's subscriber list
      if (event?.creator_id) {
        await supabase.from("subscribers").upsert(
          {
            creator_id: event.creator_id,
            email: email.trim().toLowerCase(),
            name: name.trim() || null,
            source: "rsvp",
            metadata: { event_id: eventId, event_title: event.title },
          },
          { onConflict: "creator_id,email" }
        );
      }

      // Send confirmation email
      await supabase.functions.invoke("send-rsvp-email", {
        body: {
          recipientEmail: email.trim().toLowerCase(),
          recipientName: name.trim() || undefined,
          eventTitle: event?.title,
          eventDate: event?.starts_at ? format(new Date(event.starts_at), "EEEE, MMMM d, yyyy 'at' h:mm a") : "TBD",
          creatorName: creator?.display_name || "Creator",
          eventId,
        },
      });

      setRsvpDone(true);
      toast.success("RSVP confirmed! Check your email.");
    } catch (err: any) {
      toast.error(err.message || "Failed to RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <p className="text-white/50">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <SEOHead title={`RSVP: ${event.title} | UPLY`} description={event.description || `RSVP for ${event.title}`} />

      {/* Cover Image */}
      {event.cover_image_url && (
        <div className="relative h-48 w-full">
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
        </div>
      )}

      <div className="px-5 py-6 max-w-lg mx-auto">
        {/* Creator info */}
        {creator && (
          <div className="flex items-center gap-2 mb-4">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} className="w-8 h-8 rounded-full object-cover" alt={creator.display_name || ""} loading="lazy" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold">
                {creator.display_name?.[0]}
              </div>
            )}
            <span className="text-sm text-white/70">{creator.display_name}</span>
          </div>
        )}

        <h1 className="text-2xl font-bold text-white mb-3">{event.title}</h1>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <CalendarDays className="w-4 h-4" />
            {format(new Date(event.starts_at), "EEEE, MMMM d, yyyy")}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock className="w-4 h-4" />
            {format(new Date(event.starts_at), "h:mm a")} — {format(new Date(event.ends_at), "h:mm a")}
          </div>
          {event.location_name && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <MapPin className="w-4 h-4" />
              {event.location_name}
            </div>
          )}
          {event.capacity && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Users className="w-4 h-4" />
              {event.capacity} spots
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-sm text-white/50 mb-6 leading-relaxed">{event.description}</p>
        )}

        {/* RSVP Form */}
        {rsvpDone ? (
          <div className="text-center py-8 rounded-2xl border" style={{ background: "rgba(61, 124, 255,0.05)", borderColor: "rgba(61, 124, 255,0.2)" }}>
            <Check className="w-12 h-12 mx-auto mb-3" style={{ color: "#3D7CFF" }} />
            <h2 className="text-lg font-bold text-white mb-1">You're in!</h2>
            <p className="text-sm text-white/50">Check your email for confirmation and event details.</p>
          </div>
        ) : (
          <form onSubmit={handleRSVP} className="space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12"
            />
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12"
            />
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl text-sm font-bold gap-2"
              style={{ background: "#3D7CFF", color: "#0A0A0A" }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              RSVP — I'm Going
            </Button>
            <p className="text-[10px] text-white/30 text-center">
              You're subscribing to {creator?.display_name || "this creator"}'s list on UPLY. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
