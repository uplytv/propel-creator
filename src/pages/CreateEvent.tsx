import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Monitor, MapPin, Globe, Upload, Image, CalendarDays, DollarSign,
  Loader2, ArrowLeft, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useCreateEvent, useUpdateEvent } from "@/hooks/useEvents";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const eventTypes = [
  { value: "virtual", label: "Virtual", icon: Monitor, emoji: "🖥️", color: "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]" },
  { value: "in_person", label: "In Person", icon: MapPin, emoji: "📍", color: "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]" },
  { value: "hybrid", label: "Hybrid", icon: Globe, emoji: "🌐", color: "border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]" },
];

const refundPolicies = [
  { value: "no_refunds", label: "No Refunds" },
  { value: "24_hours", label: "24 Hours Before" },
  { value: "48_hours", label: "48 Hours Before" },
  { value: "7_days", label: "7 Days Before" },
];

const timezones = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "Pacific/Honolulu", "Europe/London", "Europe/Paris",
];

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("virtual");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationState, setLocationState] = useState("");
  const [virtualLink, setVirtualLink] = useState("");
  const [streamOnUply, setStreamOnUply] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("19:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("21:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [isFree, setIsFree] = useState(false);
  const [ticketPrice, setTicketPrice] = useState("10");
  const [ticketQuantity, setTicketQuantity] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("no_refunds");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showLocation = eventType === "in_person" || eventType === "hybrid";
  const showVirtual = eventType === "virtual" || eventType === "hybrid";

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/event-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("covers").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("covers").getPublicUrl(path);
      setCoverUrl(publicUrl);
    }
    setUploading(false);
  }

  async function handleSave(publish: boolean) {
    if (!user || !title || !startDate || !endDate) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const startsAt = new Date(`${startDate}T${startTime}`).toISOString();
      const endsAt = new Date(`${endDate}T${endTime}`).toISOString();

      const eventData: any = {
        creator_id: user.id,
        title,
        description,
        event_type: eventType,
        location_name: showLocation ? locationName : null,
        location_address: showLocation ? locationAddress : null,
        location_city: showLocation ? locationCity : null,
        location_state: showLocation ? locationState : null,
        virtual_link: showVirtual ? virtualLink : null,
        stream_on_uply: showVirtual ? streamOnUply : false,
        cover_image_url: coverUrl,
        starts_at: startsAt,
        ends_at: endsAt,
        timezone,
        is_free: isFree,
        ticket_price: isFree ? 0 : parseFloat(ticketPrice) || 0,
        ticket_quantity: ticketQuantity ? parseInt(ticketQuantity) : null,
        refund_policy: refundPolicy,
        status: publish ? "published" : "draft",
      };

      const result = await createEvent.mutateAsync(eventData);

      if (publish) {
        toast({ title: "Event published! 🎉" });
      }

      navigate("/events");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate("/events")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6">Create Event</h1>

        <div className="space-y-6">
          {/* Cover Image */}
          <div>
            <Label className="mb-2 block">Cover Image</Label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl aspect-video flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors overflow-hidden"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Image className="w-8 h-8" />
                  <span className="text-sm">Click to upload cover image</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="mb-2 block">Event Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Awesome Event" />
          </div>

          {/* Description */}
          <div>
            <Label className="mb-2 block">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Tell people about your event..." />
          </div>

          {/* Event Type */}
          <div>
            <Label className="mb-3 block">Event Type</Label>
            <div className="grid grid-cols-3 gap-3">
              {eventTypes.map(t => (
                <button
                  key={t.value}
                  onClick={() => setEventType(t.value)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    eventType === t.value ? t.color : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <div className="text-sm font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Location fields */}
          {showLocation && (
            <div className="space-y-3 p-4 bg-card rounded-xl border border-border">
              <Label className="text-sm font-semibold">📍 Location Details</Label>
              <Input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Venue Name" />
              <Input value={locationAddress} onChange={e => setLocationAddress(e.target.value)} placeholder="Street Address" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={locationCity} onChange={e => setLocationCity(e.target.value)} placeholder="City" />
                <Input value={locationState} onChange={e => setLocationState(e.target.value)} placeholder="State" />
              </div>
            </div>
          )}

          {/* Virtual fields */}
          {showVirtual && (
            <div className="space-y-3 p-4 bg-card rounded-xl border border-border">
              <Label className="text-sm font-semibold">🖥️ Virtual Settings</Label>
              <Input value={virtualLink} onChange={e => setVirtualLink(e.target.value)} placeholder="Zoom, StreamYard, or any URL" />
              <div className="flex items-center gap-3">
                <Switch checked={streamOnUply} onCheckedChange={setStreamOnUply} />
                <Label className="text-sm">Stream on UPLY instead</Label>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="space-y-3">
            <Label className="mb-2 block">Date & Time *</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Start Time</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">End Time</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {timezones.map(tz => <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Ticketing */}
          <div className="space-y-3 p-4 bg-card rounded-xl border border-border">
            <Label className="text-sm font-semibold">🎟️ Ticketing</Label>
            <div className="flex items-center gap-3">
              <Switch checked={isFree} onCheckedChange={setIsFree} />
              <Label className="text-sm">Free Event</Label>
            </div>
            {!isFree && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Ticket Price ($)</Label>
                  <Input type="number" min="1" max="10000" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Ticket Quantity (blank = unlimited)</Label>
                  <Input type="number" min="1" value={ticketQuantity} onChange={e => setTicketQuantity(e.target.value)} placeholder="Unlimited" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Refund Policy</Label>
                  <Select value={refundPolicy} onValueChange={setRefundPolicy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {refundPolicies.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button className="flex-1" onClick={() => handleSave(true)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarDays className="w-4 h-4 mr-2" />}
              Publish Event
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
