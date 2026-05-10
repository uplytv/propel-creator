import { PodcastEpisode, useIncrementEpisodePlay } from '../hooks/usePodcastEpisodes';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Headphones, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';

interface Props {
  episode: PodcastEpisode;
}

function formatDuration(s: number | null) {
  if (!s) return '--:--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function EpisodeCard({ episode }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const incPlay = useIncrementEpisodePlay();

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      incPlay.mutate(episode.id);
    }
  };

  return (
    <Card className="p-4 flex gap-3 items-start">
      {episode.cover_image_url && (
        <img
          src={episode.cover_image_url}
          alt={episode.title}
          className="w-16 h-16 rounded-md object-cover shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {episode.season_number && <span>S{episode.season_number}</span>}
          {episode.episode_number && <span>E{episode.episode_number}</span>}
          {episode.is_explicit && <Badge variant="outline" className="h-4 text-[10px]">E</Badge>}
        </div>
        <h3 className="font-semibold text-sm line-clamp-2">{episode.title}</h3>
        {episode.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{episode.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock size={12} />{formatDuration(episode.duration_seconds)}</span>
          <span className="inline-flex items-center gap-1"><Headphones size={12} />{episode.play_count.toLocaleString()}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={togglePlay} className="mt-2 h-8">
          <Play size={14} className="mr-1" />
          {playing ? 'Pause' : 'Play'}
        </Button>
        <audio ref={audioRef} src={episode.audio_url} preload="none" onEnded={() => setPlaying(false)} />
      </div>
    </Card>
  );
}
