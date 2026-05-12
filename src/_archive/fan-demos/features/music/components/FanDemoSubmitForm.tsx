import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSubmitFanDemo } from "../hooks/useFanDemos";
import { toast } from "sonner";

interface Props {
  artistId: string;
  onSubmitted?: () => void;
}

export function FanDemoSubmitForm({ artistId, onSubmitted }: Props) {
  const submit = useSubmitFanDemo();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !audioUrl.trim()) {
      toast.error("Title and audio URL are required");
      return;
    }
    try {
      await submit.mutateAsync({
        artist_id: artistId,
        title: title.trim(),
        audio_url: audioUrl.trim(),
        genre: genre.trim() || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Demo submitted!");
      setTitle("");
      setGenre("");
      setAudioUrl("");
      setDescription("");
      onSubmitted?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit");
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="demo-title">Demo title</Label>
          <Input
            id="demo-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled bedroom take"
            className="text-base min-h-[44px]"
            required
          />
        </div>
        <div>
          <Label htmlFor="demo-genre">Genre</Label>
          <Input
            id="demo-genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="indie pop, lofi, etc."
            className="text-base min-h-[44px]"
          />
        </div>
        <div>
          <Label htmlFor="demo-url">Audio URL</Label>
          <Input
            id="demo-url"
            type="url"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://..."
            className="text-base min-h-[44px]"
            required
          />
        </div>
        <div>
          <Label htmlFor="demo-desc">Note to the artist</Label>
          <Textarea
            id="demo-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's the vibe? What are you hoping for?"
            className="text-base"
            rows={4}
          />
        </div>
        <Button
          type="submit"
          disabled={submit.isPending}
          className="w-full min-h-[44px]"
        >
          {submit.isPending ? "Submitting..." : "Submit demo"}
        </Button>
      </form>
    </Card>
  );
}
