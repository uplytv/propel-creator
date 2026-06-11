import { useState } from "react";
import { Loader2, Youtube, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useClassroomModules, useCreateLesson } from "@/hooks/useClassroom";

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

interface YouTubeMetadata {
  title: string;
  thumbnail_url: string;
  author_name: string;
  video_id: string;
}

export default function YouTubeImport({ creatorId }: { creatorId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<YouTubeMetadata | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: modules = [] } = useClassroomModules(creatorId);
  const createLesson = useCreateLesson();

  const handleFetch = async () => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      toast.error("Invalid URL", { description: "Please enter a valid YouTube video URL." });
      return;
    }

    setLoading(true);
    try {
      const encodedUrl = encodeURIComponent(url);
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodedUrl}&format=json`);
      if (!res.ok) throw new Error("Could not fetch video metadata");
      const data = await res.json();

      setMetadata({
        title: data.title,
        thumbnail_url: data.thumbnail_url,
        author_name: data.author_name,
        video_id: videoId,
      });
      setLessonTitle(data.title);
    } catch (err: any) {
      toast.error("Error", { description: err.message || "Failed to fetch video info" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToClassroom = async () => {
    if (!metadata || !selectedModuleId || !lessonTitle.trim() || !user) return;
    setSaving(true);
    try {
      // Store in youtube_imports
      await supabase.from("youtube_imports").insert({
        creator_id: user.id,
        youtube_url: url,
        youtube_video_id: metadata.video_id,
        title: metadata.title,
        thumbnail_url: metadata.thumbnail_url,
      });

      // Create lesson with youtube video type
      await createLesson.mutateAsync({
        module_id: selectedModuleId,
        creator_id: user.id,
        title: lessonTitle.trim(),
        description: `YouTube video by ${metadata.author_name}`,
        video_url: `https://www.youtube.com/embed/${metadata.video_id}`,
      });

      // Update the lesson with video_type and youtube_video_id (these columns aren't in the typed insert)
      // We need to use the raw update after creation
      const { data: lessons } = await supabase
        .from("classroom_lessons")
        .select("id")
        .eq("creator_id", user.id)
        .eq("module_id", selectedModuleId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lessons?.[0]) {
        await supabase
          .from("classroom_lessons")
          .update({
            video_type: "youtube",
            youtube_video_id: metadata.video_id,
          })
          .eq("id", lessons[0].id);
      }

      queryClient.invalidateQueries({ queryKey: ["classroom-lessons"] });
      toast.success("YouTube video added! 🎬", { description: `"${lessonTitle}" added to your classroom` });

      // Reset
      setUrl("");
      setMetadata(null);
      setLessonTitle("");
      setSelectedModuleId("");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Youtube className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Import from YouTube</h3>
          <p className="text-xs text-muted-foreground">Paste a YouTube URL to add it as a classroom lesson</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setMetadata(null); }}
          placeholder="https://youtube.com/watch?v=..."
          className="flex-1"
        />
        <Button onClick={handleFetch} disabled={!url.trim() || loading} variant="outline" size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
        </Button>
      </div>

      {metadata && (
        <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
          {/* Preview card */}
          <div className="flex gap-3">
            <img src={metadata.thumbnail_url} alt={metadata.title} loading="lazy" className="w-28 h-16 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{metadata.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{metadata.author_name}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive/10 text-destructive">YouTube</span>
              </div>
            </div>
          </div>

          {/* Lesson title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Lesson Title</label>
            <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Lesson title" />
          </div>

          {/* Module selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Add to Module</label>
            {modules.length === 0 ? (
              <p className="text-xs text-muted-foreground">No modules yet. Create one in your classroom first.</p>
            ) : (
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select a module...</option>
                {modules.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSaveToClassroom}
            disabled={!selectedModuleId || !lessonTitle.trim() || saving}
            className="w-full"
            variant="hero"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Add to Classroom</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
