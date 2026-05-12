import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Camera, Video, Loader2 } from "lucide-react";
import { useSubmitConcertMemory } from "../hooks/useConcertMemories";

interface Props {
  artistId: string;
  onSubmitted?: () => void;
}

export function ConcertMemoryForm({ artistId, onSubmitted }: Props) {
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");

  const submit = useSubmitConcertMemory();

  return (
    <div className="space-y-3">
      <ToggleGroup
        type="single"
        value={mediaType}
        onValueChange={(v) => v && setMediaType(v as "photo" | "video")}
        className="justify-start"
      >
        <ToggleGroupItem value="photo" className="min-h-[44px]">
          <Camera className="w-4 h-4 mr-2" />
          Photo
        </ToggleGroupItem>
        <ToggleGroupItem value="video" className="min-h-[44px]">
          <Video className="w-4 h-4 mr-2" />
          Video
        </ToggleGroupItem>
      </ToggleGroup>

      <Input
        placeholder="Media URL"
        value={mediaUrl}
        onChange={(e) => setMediaUrl(e.target.value)}
        className="text-base"
      />
      <Textarea
        placeholder="Caption (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={280}
        className="text-base"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          className="text-base"
        />
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="text-base"
        />
      </div>
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="text-base"
      />

      <Button
        className="w-full min-h-[44px]"
        disabled={!mediaUrl || submit.isPending}
        onClick={() => {
          submit.mutate(
            {
              artist_id: artistId,
              media_type: mediaType,
              media_url: mediaUrl,
              caption: caption.trim() || undefined,
              venue: venue.trim() || undefined,
              city: city.trim() || undefined,
              concert_date: date || undefined,
            },
            {
              onSuccess: () => {
                setMediaUrl("");
                setCaption("");
                setVenue("");
                setCity("");
                setDate("");
                onSubmitted?.();
              },
            }
          );
        }}
      >
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Share Memory
      </Button>
    </div>
  );
}
