import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePostcard } from "../hooks/useRoadPostcards";
import { useToast } from "@/hooks/use-toast";
import type { PostcardMood } from "../hooks/useRoadPostcards";

const MOODS: { value: PostcardMood; label: string }[] = [
  { value: "hyped", label: "🔥 Hyped" },
  { value: "tired", label: "😴 Tired" },
  { value: "grateful", label: "🙏 Grateful" },
  { value: "homesick", label: "🏠 Homesick" },
  { value: "curious", label: "👀 Curious" },
  { value: "party", label: "🎉 Party" },
];

export function RoadPostcardForm() {
  const create = useCreatePostcard();
  const { toast } = useToast();
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState<PostcardMood | "">("");

  const submit = async () => {
    if (!city.trim() || !message.trim()) {
      toast({ title: "City and message required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        city: city.trim(),
        country: country.trim() || null,
        postcard_date: date,
        image_url: imageUrl.trim() || null,
        message: message.trim(),
        mood: (mood || null) as PostcardMood | null,
      });
      toast({ title: "Postcard sent from the road" });
      setCity("");
      setCountry("");
      setMessage("");
      setImageUrl("");
      setMood("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="pc-city">City</Label>
          <Input id="pc-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tokyo" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pc-country">Country</Label>
          <Input id="pc-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Japan" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pc-date">Date</Label>
        <Input id="pc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pc-img">Image URL</Label>
        <Input id="pc-img" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-1">
        <Label>Mood</Label>
        <Select value={mood} onValueChange={(v) => setMood(v as PostcardMood)}>
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Pick a mood" />
          </SelectTrigger>
          <SelectContent>
            {MOODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pc-msg">Message</Label>
        <Textarea
          id="pc-msg"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Sold out night in Shibuya, the crowd sang every word…"
        />
      </div>
      <Button onClick={submit} disabled={create.isPending} className="w-full min-h-11">
        Publish postcard
      </Button>
    </Card>
  );
}
