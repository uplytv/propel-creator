import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Radio } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useGeolocation, useCreateRadiate } from "@/hooks/useRadiate";

export default function RadiateNewPage() {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const create = useCreateRadiate();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);
  const [ttlHours, setTtlHours] = useState("24");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geo.data) {
      toast({ title: "Location required", description: "Allow location to set the broadcast origin." });
      return;
    }
    if (!title.trim()) return;
    try {
      await create.mutateAsync({
        title: title.trim(),
        message: message.trim() || undefined,
        link_url: linkUrl.trim() || undefined,
        city: city.trim() || undefined,
        lat: geo.data.lat,
        lng: geo.data.lng,
        radius_km: radiusKm,
        ttl_hours: parseInt(ttlHours, 10),
      });
      toast({ title: "Radiating!", description: `Live to everyone within ${radiusKm} km.` });
      navigate("/radiate/manage");
    } catch (err: any) {
      toast({ title: "Could not radiate", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-2">
        <Radio className="h-5 w-5 text-primary" />
        <h1 className="font-heading text-lg font-semibold">New radiate</h1>
      </header>

      <form onSubmit={submit} className="px-4 py-4 space-y-5 max-w-xl mx-auto">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pop-up show tonight"
            maxLength={120}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Details</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's happening, where, when…"
            rows={4}
            maxLength={600}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="link">Link (optional)</Label>
          <Input
            id="link"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City label (optional)</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Brooklyn, NY"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <Label className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Radius
            </Label>
            <span className="font-medium">{radiusKm} km</span>
          </div>
          <Slider value={[radiusKm]} min={1} max={100} step={1} onValueChange={(v) => setRadiusKm(v[0])} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ttl">Active for</Label>
          <Select value={ttlHours} onValueChange={setTtlHours}>
            <SelectTrigger id="ttl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="4">4 hours</SelectItem>
              <SelectItem value="24">24 hours</SelectItem>
              <SelectItem value="72">3 days</SelectItem>
              <SelectItem value="168">1 week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border/40 p-3 text-xs text-muted-foreground">
          {geo.isLoading && "Detecting your location…"}
          {geo.isError && "Location permission needed to broadcast."}
          {geo.data && `Origin: ${geo.data.lat.toFixed(4)}, ${geo.data.lng.toFixed(4)}`}
        </div>

        <Button type="submit" className="w-full min-h-[48px]" disabled={create.isPending || !geo.data}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start radiating"}
        </Button>
      </form>
    </div>
  );
}
