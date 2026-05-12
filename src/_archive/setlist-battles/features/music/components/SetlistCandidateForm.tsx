import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAddSetlistCandidate } from "../hooks/useSetlistVoting";
import { useToast } from "@/hooks/use-toast";

export function SetlistCandidateForm({ defaultShowLabel }: { defaultShowLabel?: string }) {
  const add = useAddSetlistCandidate();
  const { toast } = useToast();
  const [showLabel, setShowLabel] = useState(defaultShowLabel ?? "");
  const [trackTitle, setTrackTitle] = useState("");
  const [showDate, setShowDate] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async () => {
    if (!showLabel.trim() || !trackTitle.trim()) {
      toast({ title: "Show and track required", variant: "destructive" });
      return;
    }
    try {
      await add.mutateAsync({
        show_label: showLabel.trim(),
        track_title: trackTitle.trim(),
        show_date: showDate || null,
        notes: notes.trim() || null,
      });
      toast({ title: "Track added to setlist vote" });
      setTrackTitle("");
      setNotes("");
    } catch (e: any) {
      toast({ title: "Failed to add", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-1">
        <Label htmlFor="sl-show">Show</Label>
        <Input id="sl-show" value={showLabel} onChange={(e) => setShowLabel(e.target.value)} placeholder="LA · The Wiltern" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sl-date">Show date</Label>
        <Input id="sl-date" type="date" value={showDate} onChange={(e) => setShowDate(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sl-track">Track title</Label>
        <Input id="sl-track" value={trackTitle} onChange={(e) => setTrackTitle(e.target.value)} placeholder="Midnight Drive" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sl-notes">Notes</Label>
        <Textarea id="sl-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Acoustic version?" />
      </div>
      <Button onClick={submit} disabled={add.isPending} className="w-full min-h-11">
        Add to setlist vote
      </Button>
    </Card>
  );
}
