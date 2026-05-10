import { useParams } from "react-router-dom";
import { useState } from "react";
import { Loader2, Plus, Activity } from "lucide-react";
import { toast } from "sonner";
import {
  useCollabProject,
  useCollabTracks,
  useAddTrack,
  useCollabEvents,
  useLogCollabEvent,
} from "../hooks/useCollabStudio";
import { CollabTrackList } from "../components/CollabTrackList";
import { supabase } from "@/integrations/supabase/client";

export default function CollabStudioPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useCollabProject(id);
  const { data: tracks } = useCollabTracks(id);
  const events = useCollabEvents(id);
  const addTrack = useAddTrack();
  const logEvent = useLogCollabEvent();
  const [newTrack, setNewTrack] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useState(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  });

  const isMember = !!userId; // simplified — RLS enforces real access

  const handleAdd = async () => {
    if (!newTrack.trim() || !id) return;
    try {
      await addTrack.mutateAsync({
        project_id: id,
        name: newTrack.trim(),
        audio_url: audioUrl.trim() || undefined,
        position: tracks?.length ?? 0,
      });
      logEvent.mutate({ project_id: id, event_type: "add_track", payload: { name: newTrack.trim() } });
      setNewTrack("");
      setAudioUrl("");
      toast.success("Track added");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add track");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-6 text-center text-muted-foreground">Project not found.</div>;
  }

  return (
    <div className="mobile-safe-content max-w-3xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
        <p className="text-xs text-muted-foreground">
          {project.bpm} BPM{project.music_key ? ` · ${project.music_key}` : ""}
          {project.is_public ? " · Public" : " · Private"}
        </p>
      </header>

      {isMember && (
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input
              value={newTrack}
              onChange={(e) => setNewTrack(e.target.value)}
              placeholder="Track name (e.g. Drums)"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-base text-foreground"
            />
            <input
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="Audio URL (optional)"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-base text-foreground"
            />
            <button
              onClick={handleAdd}
              disabled={addTrack.isPending || !newTrack.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-foreground px-1 mb-2">Tracks</h2>
        <CollabTrackList projectId={project.id} isMember={isMember} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground px-1 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Live activity
        </h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border max-h-72 overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No activity yet.
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="p-3 text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{e.event_type}</span>
                {e.payload?.name && <span> · {e.payload.name}</span>}
                <span className="ml-2 opacity-60">
                  {new Date(e.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
