import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Monitor, MapPin, Globe, Upload, Image, CalendarDays, DollarSign,
  Loader2, ArrowLeft, Save, Ticket, UserCheck, Armchair, Sparkles
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
import { toast } from "sonner";
import { Sentry } from "@/lib/sentry";

const TICKETING_MODES = [
  { value: "ticketed", label: "Ticketed", emoji: "🎟️", icon: Ticket, desc: "Paid tickets + QR scan + resale" },
  { value: "free_rsvp", label: "Free RSVP", emoji: "✋", icon: UserCheck, desc: "Free signup, names + emails" },
  { value: "seated", label: "Assigned Seating", emoji: "💺", icon: Armchair, desc: "Seat map, buyers pick a spot" },
];

const eventTypes = [
  { value: "virtual", label: "Virtual", icon: Monitor, emoji: "🖥️", color: "border-blue-500 bg-blue-500/10 text-blue-500" },
  { value: "in_person", label: "In Person", icon: MapPin, emoji: "📍", color: "border-warning bg-warning/10 text-warning" },
  { value: "hybrid", label: "Hybrid", icon: Globe, emoji: "🌐", color: "border-primary bg-primary/10 text-primary" },
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
  const [searchParams] = useSearchParams();
  const presetMode = searchParams.get("mode");
  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ariaDrafting, setAriaDrafting] = useState(false);
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
  const [ticketingMode, setTicketingMode] = useState<"ticketed" | "free_rsvp" | "seated">(
    presetMode === "free_rsvp" || presetMode === "seated" ? presetMode : "ticketed",
  );
  const [isFree, setIsFree] = useState(presetMode === "free_rsvp");
  const [ticketPrice, setTicketPrice] = useState("10");
  const [ticketQuantity, setTicketQuantity] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("no_refunds");
  const [platformFeePct, setPlatformFeePct] = useState("5");
  const [resaleAllowed, setResaleAllowed] = useState(true);
  const [resaleCapPct, setResaleCapPct] = useState("120");
  const [seatRows, setSeatRows] = useState("8");
  const [seatCols, setSeatCols] = useState("12");
  const [blockedSeats, setBlockedSeats] = useState<Set<string>>(new Set());
  const SEAT_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const seatLabelFor = (r: number, c: number) => `${r < 26 ? SEAT_ALPHA[r] : `R${r + 1}`}${c + 1}`;
  const toggleBlocked = (label: string) =>
    setBlockedSeats((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const draftWithAria = async () => {
    const idea = `${title}\n${description}`.trim();
    if (idea.length < 8) { toast.error("Add a few words about your event first"); return; }
    setAriaDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("aria-event-copilot", {
        body: {
          description: idea,
          event_type: eventType,
          ...(ticketQuantity ? { capacity: Number(ticketQuantity) } : {}),
          ...(locationCity ? { city: locationCity } : {}),
        },
      });
      if (error) throw error;
      const d = (data as { draft?: {
        title?: string;
        description?: string;
        tiers?: Array<{ name?: string; price?: number }>;
      } } | null)?.draft;
      if (!d || (!d.title && !d.description)) {
        throw new Error("ARIA returned an empty draft");
      }
      if (d.title) setTitle(d.title);
      if (d.description) setDescription(d.description);
      const firstPrice = Array.isArray(d.tiers) ? d.tiers.find((t) => typeof t?.price === "number")?.price : undefined;
      if (typeof firstPrice === "number" && firstPrice > 0) setTicketPrice(String(firstPrice));
      toast.success("ARIA drafted your event ✨", { description: "Review and tweak below." });
    } catch (e) {
      toast.error("ARIA couldn't draft this", { description: (e as Error).message });
    } finally {
      setAriaDrafting(false);
    }
  };

  useEffect(() => {
    if (ticketingMode === "free_rsvp") setIsFree(true);
    if (ticketingMode === "seated" && isFree) setIsFree(false);
  }, [ticketingMode]);

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
      toast.error("Upload failed");
    } else {
      const { data: { publicUrl } } = supabase.storage.from("covers").getPublicUrl(path);
      setCoverUrl(publicUrl);
    }
    setUploading(false);
  }

  async function handleSave(publish: boolean) {
    if (!user || !title || !startDate || !endDate) {
      toast.error("Fill in required fields");
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
        ticket_quantity:
          ticketingMode === "seated"
            ? Math.max(0, parseInt(seatRows) * parseInt(seatCols) - blockedSeats.size)
            : ticketQuantity
              ? parseInt(ticketQuantity)
              : null,
        refund_policy: refundPolicy,
        platform_fee_pct: Math.min(0.3, Math.max(0, (parseFloat(platformFeePct) || 0) / 100)),
        ticketing_mode: ticketingMode,
        resale_allowed: ticketingMode === "ticketed" || ticketingMode === "seated" ? resaleAllowed : false,
        resale_price_cap_pct: parseInt(resaleCapPct) || 120,
        seat_map:
          ticketingMode === "seated"
            ? { rows: parseInt(seatRows) || 1, cols: parseInt(seatCols) || 1, blocked: Array.from(blockedSeats) }
            : null,
        status: publish ? "published" : "draft",
      };

      const result = await createEvent.mutateAsync(eventData);

      if (publish) {
        toast.success("Event published! 🎉");
      }

      navigate("/events");
    } catch (err) {
      Sentry.captureMessage(err, { tags: { context: "create_event" } });
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
                <img src={coverUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
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
            <div className="flex items-center justify-between mb-2">
              <Label className="block">Description</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={draftWithAria} disabled={ariaDrafting}>
                {ariaDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
                Draft with ARIA
              </Button>
            </div>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Tell people about your event... or jot an idea and let ARIA draft it." />
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

          {/* Ticketing model */}
          <div className="space-y-3 p-4 bg-card rounded-xl border border-border">
            <Label className="text-sm font-semibold">🎟️ How will people get in?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TICKETING_MODES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTicketingMode(t.value as any)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    ticketingMode === t.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="text-xl mb-1">{t.emoji}</div>
                  <div className="text-sm font-semibold text-foreground">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>

            {/* Mode-specific options */}
            {ticketingMode === "free_rsvp" && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                Attendees RSVP for free. We collect their email and send reminders + a QR check-in pass.
              </div>
            )}

            {ticketingMode !== "free_rsvp" && (
              <>
                {ticketingMode === "ticketed" && (
                  <div className="flex items-center gap-3 pt-1">
                    <Switch checked={isFree} onCheckedChange={setIsFree} />
                    <Label className="text-sm">Free Event (no payment)</Label>
                  </div>
                )}
                {!isFree && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Ticket Price ($)</Label>
                    <Input type="number" min="1" max="10000" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} />
                  </div>
                )}
                {ticketingMode === "ticketed" && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Ticket Quantity (blank = unlimited)</Label>
                    <Input type="number" min="1" value={ticketQuantity} onChange={e => setTicketQuantity(e.target.value)} placeholder="Unlimited" />
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Refund Policy</Label>
                  <Select value={refundPolicy} onValueChange={setRefundPolicy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {refundPolicies.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Resale controls (Ticketmaster-style) */}
                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={resaleAllowed} onCheckedChange={setResaleAllowed} />
                    <Label className="text-sm">Allow ticket resale & transfer</Label>
                  </div>
                  {resaleAllowed && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Max resale price (% of original)</Label>
                      <Input type="number" min="100" max="500" value={resaleCapPct} onChange={e => setResaleCapPct(e.target.value)} />
                      <p className="text-[11px] text-muted-foreground mt-1">Cap protects fans from price gouging. 120 = up to 1.2× face value.</p>
                    </div>
                  )}
                  {!isFree && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Platform fee (%)</Label>
                      <Input type="number" min="0" max="30" step="0.5" value={platformFeePct} onChange={e => setPlatformFeePct(e.target.value)} />
                      <p className="text-[11px] text-muted-foreground mt-1">Added on top of ticket price at checkout. Default 5%. You keep the rest.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Seat map editor */}
            {ticketingMode === "seated" && (
              <div className="pt-2 border-t border-border space-y-3">
                <Label className="text-sm font-semibold">💺 Seat Map</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Rows</Label>
                    <Input type="number" min="1" max="50" value={seatRows} onChange={e => setSeatRows(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Seats per row</Label>
                    <Input type="number" min="1" max="50" value={seatCols} onChange={e => setSeatCols(e.target.value)} />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 overflow-auto">
                  <div className="text-[10px] text-center text-muted-foreground mb-2 py-1 bg-foreground/10 rounded">STAGE</div>
                  {(() => {
                    const r = Math.min(parseInt(seatRows) || 1, 50);
                    const c = Math.min(parseInt(seatCols) || 1, 20);
                    return (
                      <div className="grid gap-1 mx-auto" style={{ gridTemplateColumns: `repeat(${c}, minmax(12px, 1fr))`, maxWidth: 360 }}>
                        {Array.from({ length: Math.min(r * c, 1000) }).map((_, i) => {
                          const label = seatLabelFor(Math.floor(i / c), i % c);
                          const isBlocked = blockedSeats.has(label);
                          return (
                            <button
                              key={i}
                              type="button"
                              aria-label={`${isBlocked ? "Unblock" : "Block"} seat ${label}`}
                              onClick={() => toggleBlocked(label)}
                              title={label}
                              className={`aspect-square rounded-sm transition-colors ${isBlocked ? "bg-muted-foreground/30" : "bg-primary/40 hover:bg-primary/70"}`}
                            />
                          );
                        })}
                      </div>
                    );
                  })()}
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    {Math.max(0, (parseInt(seatRows) || 0) * (parseInt(seatCols) || 0) - blockedSeats.size)} sellable seats · ${ticketPrice} each
                  </p>
                  <p className="text-[10px] text-muted-foreground text-center mt-1">Tap a seat to block it (aisle, stage, or removed).</p>
                </div>
              </div>
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
