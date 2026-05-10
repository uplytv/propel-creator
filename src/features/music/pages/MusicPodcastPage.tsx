import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useArtistPodcastEpisodes, useCreateEpisode, useTogglePublishEpisode } from '../hooks/usePodcastEpisodes';
import { EpisodeCard } from '../components/EpisodeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Mic, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function MusicPodcastPage() {
  const { user } = useAuth();
  const { data: episodes = [], isLoading } = useArtistPodcastEpisodes(user?.id, true);
  const create = useCreateEpisode();
  const togglePub = useTogglePublishEpisode();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [showName, setShowName] = useState('');
  const [duration, setDuration] = useState('');
  const [episodeNum, setEpisodeNum] = useState('');
  const [season, setSeason] = useState('1');
  const [isExplicit, setIsExplicit] = useState(false);

  const submit = async () => {
    if (!title.trim() || !audioUrl.trim()) {
      toast.error('Title and audio URL required');
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        audio_url: audioUrl.trim(),
        cover_image_url: coverUrl.trim() || null,
        show_name: showName.trim() || null,
        duration_seconds: duration ? parseInt(duration) : null,
        episode_number: episodeNum ? parseInt(episodeNum) : null,
        season_number: parseInt(season) || 1,
        is_explicit: isExplicit,
      });
      toast.success('Episode created');
      setShowForm(false);
      setTitle(''); setDescription(''); setAudioUrl(''); setCoverUrl('');
      setDuration(''); setEpisodeNum('');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create');
    }
  };

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-6 mobile-safe-content">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mic className="text-primary" />
          <h1 className="text-2xl font-bold">Podcast Episodes</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} className="mr-1" />
          New
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New episode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="show">Show name</Label>
              <Input id="show" value={showName} onChange={(e) => setShowName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t">Episode title</Label>
              <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d">Description</Label>
              <Textarea id="d" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="au">Audio URL</Label>
              <Input id="au" placeholder="https://...mp3" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cv">Cover image URL</Label>
              <Input id="cv" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="se">Season</Label>
                <Input id="se" type="number" inputMode="numeric" value={season} onChange={(e) => setSeason(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep">Episode #</Label>
                <Input id="ep" type="number" inputMode="numeric" value={episodeNum} onChange={(e) => setEpisodeNum(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="du">Duration (s)</Label>
                <Input id="du" type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ex">Explicit</Label>
              <Switch id="ex" checked={isExplicit} onCheckedChange={setIsExplicit} />
            </div>
            <Button onClick={submit} disabled={create.isPending} className="w-full">
              {create.isPending ? 'Saving…' : 'Create episode'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : episodes.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          No episodes yet. Create your first episode above.
        </Card>
      ) : (
        <div className="space-y-3">
          {episodes.map((ep) => (
            <div key={ep.id} className="space-y-2">
              <EpisodeCard episode={ep} />
              <div className="flex items-center justify-end gap-2 px-2">
                <span className="text-xs text-muted-foreground">
                  {ep.is_published ? 'Published' : 'Draft'}
                </span>
                <Switch
                  checked={ep.is_published}
                  onCheckedChange={(v) => togglePub.mutate({ id: ep.id, publish: v })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
