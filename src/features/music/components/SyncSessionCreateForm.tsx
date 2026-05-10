import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateSyncSession } from "../hooks/useSyncSessions";
import { useToast } from "@/hooks/use-toast";

export function SyncSessionCreateForm({ artistId }: { artistId?: string }) {
  const create = useCreateSyncSession();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(50);
  const [hostMessage, setHostMessage] = useState("");

  const submit = async () => {
    if (!title.trim() || !scheduledAt) {
      toast({ title: "Title and time required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        album_name: albumName.trim() || null,
        cover_url: coverUrl.trim() || null,
        spotify_url: spotifyUrl.trim() || null,
        duration_minutes: duration,
        capacity,
        host_message: hostMessage.trim() || null,
        artist_id: artistId ?? null,
      });
      toast({ title: "Listening session scheduled" });
      setTitle("");
      setAlbumName("");
      setCoverUrl("");
      setSpotifyUrl("");
      setHostMessage("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-1">
        <Label htmlFor="ss-title">Title</Label>
        <Input id="ss-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Album drop midnight listen" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ss-album">Album / playlist name</Label>
        <Input id="ss-album" value={albumName} onChange={(e) => setAlbumName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ss-cover">Cover URL</Label>
        <Input id="ss-cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ss-spot">Spotify / streaming link</Label>
        <Input id="ss-spot" value={spotifyUrl} onChange={(e) => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/album/..." />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ss-when">When</Label>
        <Input id="ss-when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="ss-dur">Duration (min)</Label>
          <Input
            id="ss-dur"
            type="number"
            min={5}
            max={600}
            value={duration}
            onChange={(e) => setDuration(Math.max(5, Math.min(600, parseInt(e.target.value) || 60)))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ss-cap">Capacity</Label>
          <Input
            id="ss-cap"
            type="number"
            min={2}
            max={5000}
            value={capacity}
            onChange={(e) => setCapacity(Math.max(2, Math.min(5000, parseInt(e.target.value) || 50)))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ss-msg">Host message</Label>
        <Textarea id="ss-msg" rows={2} value={hostMessage} onChange={(e) => setHostMessage(e.target.value)} placeholder="Hit play together at the top of the hour…" />
      </div>
      <Button onClick={submit} disabled={create.isPending} className="w-full min-h-11">
        Schedule listening session
      </Button>
    </Card>
  );
}
