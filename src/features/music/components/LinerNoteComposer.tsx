import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateLinerNote, type LinerNoteStoryType } from "../hooks/useLinerNotes";

const TYPES: { value: LinerNoteStoryType; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "credits", label: "Credits" },
  { value: "recording", label: "Recording" },
  { value: "inspiration", label: "Inspiration" },
  { value: "lyric_meaning", label: "Lyric Meaning" },
];

export function LinerNoteComposer({ onCreated }: { onCreated?: () => void }) {
  const [trackTitle, setTrackTitle] = useState("");
  const [album, setAlbum] = useState("");
  const [body, setBody] = useState("");
  const [storyType, setStoryType] = useState<LinerNoteStoryType>("story");
  const create = useCreateLinerNote();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTitle.trim() || !body.trim()) {
      toast.error("Track and note are required");
      return;
    }
    try {
      await create.mutateAsync({
        track_title: trackTitle.trim(),
        album: album.trim() || null,
        body: body.trim(),
        story_type: storyType,
      });
      toast.success("Liner note published");
      setTrackTitle("");
      setAlbum("");
      setBody("");
      setStoryType("story");
      onCreated?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to publish");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-border bg-card/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ln-track">Track title</Label>
          <Input
            id="ln-track"
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            placeholder="Track name"
            className="text-base"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ln-album">Album (optional)</Label>
          <Input
            id="ln-album"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            placeholder="Album"
            className="text-base"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={storyType} onValueChange={(v) => setStoryType(v as LinerNoteStoryType)}>
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ln-body">Note</Label>
        <Textarea
          id="ln-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share the story behind the track..."
          rows={5}
          maxLength={2000}
          className="text-base"
          required
        />
        <p className="text-right text-[11px] text-muted-foreground">{body.length}/2000</p>
      </div>
      <Button type="submit" className="min-h-11 w-full" disabled={create.isPending}>
        {create.isPending ? "Publishing..." : "Publish liner note"}
      </Button>
    </form>
  );
}
