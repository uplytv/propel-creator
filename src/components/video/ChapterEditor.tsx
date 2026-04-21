import { useState } from "react";
import { useVideoChapters, useUpsertChapter, useDeleteChapter, type VideoChapter } from "@/hooks/useVideoChapters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ListVideo } from "lucide-react";
import { toast } from "sonner";

interface Props {
  videoId: string;
}

function parseTimecode(input: string): number | null {
  // Accepts "12", "1:23", "1:02:30"
  const parts = input.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ChapterEditor({ videoId }: Props) {
  const { data: chapters } = useVideoChapters(videoId);
  const upsert = useUpsertChapter(videoId);
  const del = useDeleteChapter(videoId);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");

  const handleAdd = async () => {
    const seconds = parseTimecode(time);
    if (!title.trim() || seconds === null) {
      toast.error("Enter a title and timecode like 1:23");
      return;
    }
    await upsert.mutateAsync({
      title: title.trim(),
      start_seconds: seconds,
      position: (chapters?.length ?? 0),
    });
    setTitle("");
    setTime("");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <ListVideo className="w-4 h-4" /> Chapters
      </h3>

      <div className="flex gap-2">
        <Input
          placeholder="Timecode (1:23)"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-28"
        />
        <Input
          placeholder="Chapter title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} disabled={upsert.isPending}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ul className="space-y-1">
        {(chapters ?? []).map((c: VideoChapter) => (
          <li key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/40">
            <span className="text-xs font-mono text-muted-foreground w-16">{fmt(c.start_seconds)}</span>
            <span className="text-sm text-foreground flex-1 truncate">{c.title}</span>
            <button
              onClick={() => del.mutate(c.id)}
              className="text-muted-foreground hover:text-destructive p-1"
              aria-label="Delete chapter"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
        {(!chapters || chapters.length === 0) && (
          <li className="text-xs text-muted-foreground text-center py-2">No chapters yet.</li>
        )}
      </ul>
    </div>
  );
}
