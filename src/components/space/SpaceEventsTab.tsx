import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, Ticket, Plus, Globe, Radio, Music, Users, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  creatorId: string;
  isOwner: boolean;
}

const typeBadge = (event: any) => {
  if (event.stream_on_uply || event.event_type === "live") {
    return { label: "LIVE", icon: Radio, className: "bg-red-500/15 text-red-400" };
  }
  if (event.event_type === "in_person" || event.event_type === "in-person") {
    return { label: "IN-PERSON", icon: MapPin, className: "bg-blue-500/15 text-blue-400" };
  }
  if (event.is_free || Number(event.ticket_price || 0) === 0) {
    return { label: "FREE", icon: Users, className: "bg-emerald-500/15 text-emerald-400" };
  }
  return { label: "ONLINE", icon: Globe, className: "bg-teal-500/15 text-teal-400" };
};

function EventCard({ event, isOwn, isOwner, creatorUsername }: { event: any; isOwn: boolean; isOwner: boolean; creatorUsername?: string }) {
  const navigate = useNavigate();
  const eventPath = creatorUsername && event.slug
    ? `/${creatorUsername}/events/${event.slug}`
    : `/events/global/${event.id}`;
  const badge = typeBadge(event);
  const Icon = badge.icon;
  const startDate = event.starts_at ? new Date(event.starts_at) : null;
  const price = Number(event.ticket_price || 0);

  return (
    <div className="rounded-xl overflow-hidden border border-surface-border bg-surface-raised">
      <div className="relative aspect-video bg-secondary">
        {event.cover_image_url ? (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${badge.className}`}>
          <Icon className="w-3 h-3" />
          {badge.label}
        </div>
        {isOwn && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">
            HOST
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">{event.title}</h3>
        {startDate && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(startDate, "MMM d · h:mm a")}
          </p>
        )}
        {(event.location_city || event.location_name) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.location_name || event.location_city}</span>
          </p>
        )}
        <div className="flex items-center justify-between pt-1.5">
          <span className="text-xs font-bold text-foreground">
            {price > 0 ? `$${price.toFixed(2)}` : "Free"}
          </span>
          <Button
            size="sm"
            className="h-7 rounded-full text-xs px-3"
            onClick={() => navigate(eventPath)}
          >
            <Ticket className="w-3 h-3 mr-1" />
            {price > 0 ? "Get Tickets" : event.stream_on_uply ? "Watch Live" : "Register"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttendingEventCard({ attendance }: { attendance: any }) {
  const ge = attendance.global_event;
  if (!ge) return null;
  const startDate = ge.starts_at ? new Date(ge.starts_at) : null;
  return (
    <div className="rounded-xl overflow-hidden border border-surface-border bg-surface-raised">
      <div className="relative aspect-video bg-secondary">
        {ge.image_url ? (
          <img src={ge.image_url} alt={ge.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 flex items-center gap-1">
          <Music className="w-3 h-3" /> CONCERT
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-green/20 text-accent-green">
          ATTENDING
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">{ge.title}</h3>
        {startDate && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(startDate, "MMM d · h:mm a")}
          </p>
        )}
        {(ge.venue || ge.city) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{ge.venue || ge.city}</span>
          </p>
        )}
        {ge.ticket_url && (
          <div className="pt-1.5">
            <a href={ge.ticket_url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-7 rounded-full text-xs px-3 w-full">
                <Ticket className="w-3 h-3 mr-1" />
                Get Tickets
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function DigitalProductCard({ product, isOwner }: { product: any; isOwner: boolean }) {
  const { user } = useAuth();
  const [buying, setBuying] = useState(false);

  const handleBuy = async () => {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-product-checkout", {
        body: { product_id: product.id, purchase_type: "digital", creator_id: product.user_id },
      });
      if (error) throw error;
      if ((data as any)?.already_purchased) {
        toast.success("You already own this — check your inbox for the download link.");
        setBuying(false);
        return;
      }
      if ((data as any)?.url) {
        window.location.href = (data as any).url;
      }
    } catch (err: any) {
      toast.error("Checkout failed", { description: err.message });
      setBuying(false);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-surface-border bg-surface-raised">
      <div className="relative aspect-video bg-secondary">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Download className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 flex items-center gap-1">
          <Download className="w-3 h-3" /> DOWNLOAD
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between pt-1.5">
          <span className="text-xs font-bold text-foreground">
            {Number(product.price) > 0 ? `$${Number(product.price).toFixed(2)}` : "Free"}
          </span>
          {isOwner ? (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Yours</span>
          ) : (
            <Button
              size="sm"
              className="h-7 rounded-full text-xs px-3"
              onClick={handleBuy}
              disabled={buying}
            >
              {buying ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 mr-1" /> Buy</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SpaceEventsTab({ creatorId, isOwner }: Props) {
  const navigate = useNavigate();

  const { data: creatorProfile } = useQuery({
    queryKey: ["space-creator-username", creatorId],
    enabled: !!creatorId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", creatorId)
        .maybeSingle();
      return data;
    },
  });
  const creatorUsername = creatorProfile?.username || undefined;

  const { data: ownEvents = [], isLoading: loadingOwn } = useQuery({
    queryKey: ["space-own-events", creatorId],
    enabled: !!creatorId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", creatorId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20);
      return data || [];
    },
  });

  const { data: attendingEvents = [] } = useQuery({
    queryKey: ["space-attending-events", creatorId],
    enabled: !!creatorId,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("attendance")
          .select("*, global_event:global_event_id(title, starts_at, venue, city, image_url, ticket_url, category)")
          .eq("user_id", creatorId)
          .gte("attend_date", new Date().toISOString().split("T")[0])
          .order("attend_date", { ascending: true })
          .limit(20);
        return (data || []).filter((a: any) => a.global_event);
      } catch {
        return [];
      }
    },
  });

  const { data: digitalProducts = [] } = useQuery({
    queryKey: ["space-digital-products", creatorId],
    enabled: !!creatorId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", creatorId)
        .eq("type", "digital")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const isEmpty =
    !loadingOwn && ownEvents.length === 0 && attendingEvents.length === 0 && digitalProducts.length === 0;

  return (
    <div className="px-4 pt-4 space-y-6">
      {isOwner && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/products")} className="rounded-full">
            <Download className="w-4 h-4 mr-1" />
            Manage Downloads
          </Button>
          <Button size="sm" onClick={() => navigate("/events/create")} className="rounded-full">
            <Plus className="w-4 h-4 mr-1" />
            New Event
          </Button>
        </div>
      )}

      {ownEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
            Upcoming Events
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ownEvents.map((event: any) => (
              <EventCard key={event.id} event={event} isOwn isOwner={isOwner} creatorUsername={creatorUsername} />
            ))}
          </div>
        </section>
      )}

      {attendingEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
            Attending
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attendingEvents.map((a: any) => (
              <AttendingEventCard key={a.id} attendance={a} />
            ))}
          </div>
        </section>
      )}

      {digitalProducts.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">
            Digital Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {digitalProducts.map((p: any) => (
              <DigitalProductCard key={p.id} product={p} isOwner={isOwner} />
            ))}
          </div>
        </section>
      )}

      {isEmpty && (
        <div className="p-12 text-center rounded-xl border border-surface-border bg-surface-raised">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold text-foreground mb-1">
            {isOwner ? "Nothing here yet" : "No upcoming events"}
          </p>
          {isOwner ? (
            <button
              onClick={() => navigate("/events/create")}
              className="text-sm text-primary hover:underline"
            >
              Create your first event →
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">Check back soon!</p>
          )}
        </div>
      )}
    </div>
  );
}
