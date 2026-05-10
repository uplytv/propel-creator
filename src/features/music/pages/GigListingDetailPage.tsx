import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Music, Clock, DollarSign, Send } from "lucide-react";
import { useGigListing, useCreateBookingInquiry } from "../hooks/useGigMarketplace";
import { toast } from "sonner";

export default function GigListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useGigListing(id);
  const inquire = useCreateBookingInquiry();

  const [form, setForm] = useState({
    event_title: "",
    event_date: "",
    event_location: "",
    duration_minutes: 60,
    budget_cents: 0,
    message: "",
  });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!listing) return <div className="p-6">Listing not found.</div>;

  const send = async () => {
    if (!form.event_title || !form.event_date) {
      toast.error("Event title and date are required");
      return;
    }
    try {
      await inquire.mutateAsync({
        listing_id: listing.id,
        artist_id: listing.artist_id,
        ...form,
        budget_cents: form.budget_cents * 100,
      });
      toast.success("Inquiry sent!");
      setForm({ event_title: "", event_date: "", event_location: "", duration_minutes: 60, budget_cents: 0, message: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
        {listing.artwork_url ? (
          <img src={listing.artwork_url} alt={listing.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-display font-bold">{listing.title}</h1>
          <Badge className="capitalize">{listing.gig_type}</Badge>
        </div>
        {listing.description && <p className="text-muted-foreground">{listing.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Starting at
          </p>
          <p className="text-lg font-bold text-primary">${(listing.base_price_cents / 100).toFixed(0)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> Min duration
          </p>
          <p className="text-lg font-bold">{listing.min_duration_minutes} min</p>
        </Card>
        {listing.home_city && (
          <Card className="p-3 col-span-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Based in
            </p>
            <p className="font-medium">{listing.home_city} · travels {listing.travel_radius_km}km</p>
          </Card>
        )}
      </div>

      {listing.demo_url && <audio src={listing.demo_url} controls className="w-full" preload="none" />}

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Send a booking inquiry</h3>
        <Input placeholder="Event title" value={form.event_title} onChange={(e) => setForm({ ...form, event_title: e.target.value })} />
        <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        <Input placeholder="Event location" value={form.event_location} onChange={(e) => setForm({ ...form, event_location: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Duration (min)"
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
          />
          <Input
            type="number"
            placeholder="Budget ($)"
            value={form.budget_cents}
            onChange={(e) => setForm({ ...form, budget_cents: Number(e.target.value) })}
          />
        </div>
        <Textarea placeholder="Tell the artist about your event" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <Button onClick={send} disabled={inquire.isPending} className="w-full">
          <Send className="w-4 h-4 mr-2" /> Send inquiry
        </Button>
      </Card>
    </div>
  );
}
