import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateLyricSnippet, type LyricSnippetStatus } from "../hooks/useLyricSnippets";
import { toast } from "@/hooks/use-toast";

const STATUSES: LyricSnippetStatus[] = ["draft", "refining", "finalized", "shelved"];

export function LyricSnippetCreateForm({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("");
  const [snippet, setSnippet] = useState("");
  const [mood, setMood] = useState("");
  const [status, setStatus] = useState<LyricSnippetStatus>("draft");
  const create = useCreateLyricSnippet();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !snippet.trim()) return;
    try {
      await create.mutateAsync({
        title: title.trim(),
        snippet_text: snippet.trim(),
        mood: mood.trim() || undefined,
        status,
      });
      setTitle("");
      setSnippet("");
      setMood("");
      setStatus("draft");
      toast({ title: "Snippet posted" });
      onCreated?.();
    } catch (err: any) {
      toast({ title: "Couldn't post", description: err.message, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="lyric-title">Working title</Label>
        <Input
          id="lyric-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled verse"
          className="text-base"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lyric-text">Lyric snippet</Label>
        <Textarea
          id="lyric-text"
          value={snippet}
          onChange={(e) => setSnippet(e.target.value)}
          placeholder="Pour the lines here..."
          className="min-h-[140px] text-base font-mono"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lyric-mood">Mood</Label>
          <Input
            id="lyric-mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="late-night, hopeful..."
            className="text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as LyricSnippetStatus)}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button type="submit" className="w-full h-11" disabled={create.isPending}>
        {create.isPending ? "Posting..." : "Post snippet"}
      </Button>
    </form>
  );
}
