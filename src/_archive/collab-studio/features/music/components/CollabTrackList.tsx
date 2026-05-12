import { useState } from "react";
import { Lock, Unlock, Trash2, Volume2, VolumeX, Play, Pause } from "lucide-react";
import {
  useCollabTracks,
  useUpdateTrack,
  useDeleteTrack,
  useLogCollabEvent,
  type CollabTrack,
} from "../hooks/useCollabStudio";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  projectId: string;
  isMember: boolean;
}

export function CollabTrackList({ projectId, isMember }: Props) {
  const { data: tracks } = useCollabTracks(projectId);
  const updateTrack = useUpdateTrack();
  const deleteTrack = useDeleteTrack();
  const logEvent = useLogCollabEvent();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const togglePlay = (t: CollabTrack) => {
    if (!t.audio_url) return;
    if (playingId === t.id) {
      audio?.pause();
      setPlayingId(null);
      return;
    }
    audio?.pause();
    const a = new Audio(t.audio_url);
    a.volume = t.volume;
    a.play().catch(() => {});
    a.onended = () => setPlayingId(null);
    setAudio(a);
    setPlayingId(t.id);
  };

  const toggleLock = async (t: CollabTrack) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newLock = t.locked_by ? null : user.id;
    await updateTrack.mutateAsync({ id: t.id, patch: { locked_by: newLock } });
    logEvent.mutate({ project_id: projectId, event_type: newLock ? "lock" : "unlock", payload: { track_id: t.id } });
  };

  const toggleMute = (t: CollabTrack) => {
    updateTrack.mutate({ id: t.id, patch: { is_muted: !t.is_muted } });
  };

  const setVolume = (t: CollabTrack, v: number) => {
    updateTrack.mutate({ id: t.id, patch: { volume: v } });
  };

  const remove = (t: CollabTrack) => {
    if (!confirm(`Delete track "${t.name}"?`)) return;
    deleteTrack.mutate(t.id);
    logEvent.mutate({ project_id: projectId, event_type: "delete_track", payload: { track_id: t.id } });
  };

  if (!tracks || tracks.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No tracks yet. Add your first track to start the jam.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((t) => {
        const locked = !!t.locked_by;
        return (
          <div
            key={t.id}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
          >
            <button
              onClick={() => togglePlay(t)}
              disabled={!t.audio_url}
              className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center disabled:opacity-40 shrink-0"
              aria-label="Play"
            >
              {playingId === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{t.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={t.volume}
                  disabled={!isMember}
                  onChange={(e) => setVolume(t, parseFloat(e.target.value))}
                  className="flex-1 accent-primary"
                />
              </div>
            </div>
            {isMember && (
              <>
                <button
                  onClick={() => toggleMute(t)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Mute"
                >
                  {t.is_muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => toggleLock(t)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${locked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="Lock"
                >
                  {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => remove(t)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
