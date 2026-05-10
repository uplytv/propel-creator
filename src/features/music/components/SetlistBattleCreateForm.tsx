import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateSetlistBattle } from "../hooks/useSetlistBattles";

export function SetlistBattleCreateForm({ onCreated }: { onCreated?: () => void }) {
  const create = useCreateSetlistBattle();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [showDate, setShowDate] = useState("");
  const [labelA, setLabelA] = useState("Setlist A");
  const [labelB, setLabelB] = useState("Setlist B");
  const [tracksA, setTracksA] = useState("");
  const [tracksB, setTracksB] = useState("");

  const splitLines = (s: string) =>
    s.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !labelA.trim() || !labelB.trim()) return;
    try {
      await create.mutateAsync({
        title: title.trim(),
        show_date: showDate || null,
        option_a_label: labelA.trim(),
        option_b_label: labelB.trim(),
        option_a_tracks: splitLines(tracksA),
        option_b_tracks: splitLines(tracksB),
      });
      toast({ title: "Battle posted", description: "Fans can vote now." });
      setTitle(""); setShowDate(""); setTracksA(""); setTracksB("");
      onCreated?.();
    } catch (err) {
      toast({
        title: "Could not create battle",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4 bg-card/40 border-border/50">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="sb-title">Battle title</Label>
          <Input id="sb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pick the closing 4 songs" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sb-date">Show date (optional)</Label>
          <Input id="sb-date" type="date" value={showDate} onChange={(e) => setShowDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sb-la">Option A label</Label>
            <Input id="sb-la" value={labelA} onChange={(e) => setLabelA(e.target.value)} required />
            <Textarea
              placeholder="Tracks (one per line)"
              value={tracksA}
              onChange={(e) => setTracksA(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sb-lb">Option B label</Label>
            <Input id="sb-lb" value={labelB} onChange={(e) => setLabelB(e.target.value)} required />
            <Textarea
              placeholder="Tracks (one per line)"
              value={tracksB}
              onChange={(e) => setTracksB(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <Button type="submit" disabled={create.isPending} className="w-full h-11">
          {create.isPending ? "Posting..." : "Post battle"}
        </Button>
      </form>
    </Card>
  );
}
