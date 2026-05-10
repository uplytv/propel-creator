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
import { useCreateDiaryEntry } from "../hooks/useStudioDiary";
import type { StudioPhase, StudioMood } from "../hooks/useStudioDiary";
import { useToast } from "@/hooks/use-toast";

const PHASES: { value: StudioPhase; label: string }[] = [
  { value: "writing", label: "Writing" },
  { value: "recording", label: "Recording" },
  { value: "producing", label: "Producing" },
  { value: "mixing", label: "Mixing" },
  { value: "mastering", label: "Mastering" },
  { value: "release_prep", label: "Release prep" },
];

const MOODS: { value: StudioMood; label: string }[] = [
  { value: "flow", label: "🌊 Flow" },
  { value: "grind", label: "💪 Grind" },
  { value: "breakthrough", label: "💡 Breakthrough" },
  { value: "stuck", label: "🧱 Stuck" },
  { value: "exhausted", label: "🥱 Exhausted" },
  { value: "hyped", label: "🚀 Hyped" },
];

export function StudioDiaryEntryForm() {
  const create = useCreateDiaryEntry();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<StudioPhase>("recording");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState<string>("");
  const [mood, setMood] = useState<StudioMood | "">("");
  const [notes, setNotes] = useState("");
  const [clipUrl, setClipUrl] = useState("");

  const submit = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        phase,
        session_date: date,
        notes: notes.trim() || null,
        hours_logged: hours ? Math.max(0, Math.min(24, parseFloat(hours))) : null,
        mood: (mood || null) as StudioMood | null,
        clip_url: clipUrl.trim() || null,
      });
      toast({ title: "Diary entry published" });
      setTitle("");
      setNotes("");
      setHours("");
      setClipUrl("");
      setMood("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-1">
        <Label htmlFor="sd-title">Title</Label>
        <Input
          id="sd-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tracked drums for Track 4"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Phase</Label>
          <Select value={phase} onValueChange={(v) => setPhase(v as StudioPhase)}>
            <SelectTrigger className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Mood</Label>
          <Select value={mood} onValueChange={(v) => setMood(v as StudioMood)}>
            <SelectTrigger className="min-h-11">
              <SelectValue placeholder="Optional" />
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
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="sd-date">Date</Label>
          <Input id="sd-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sd-hours">Hours</Label>
          <Input
            id="sd-hours"
            type="number"
            inputMode="decimal"
            min={0}
            max={24}
            step={0.25}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="4.5"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="sd-clip">Clip URL (optional)</Label>
        <Input
          id="sd-clip"
          value={clipUrl}
          onChange={(e) => setClipUrl(e.target.value)}
          placeholder="https://...mp3"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sd-notes">Notes</Label>
        <Textarea
          id="sd-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Took the bridge in a different direction…"
        />
      </div>
      <Button onClick={submit} disabled={create.isPending} className="w-full min-h-11">
        Publish entry
      </Button>
    </Card>
  );
}
