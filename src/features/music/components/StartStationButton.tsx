import { Radio } from 'lucide-react';
import { fetchRecs, type StationSeed } from '../hooks/useRecs';
import { saveRecentStation } from '../hooks/useRecentStations';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { trackEvent } from '@/lib/posthog';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { Track } from '../types';

interface Props {
  seed: StationSeed;
  /** Optional first track to play (for track seeds, the seed track itself). */
  firstTrack?: Track;
  variant?: 'icon' | 'pill' | 'menuItem';
  className?: string;
}

/**
 * Starts an algorithmic radio station from a track or artist seed.
 * Fetches initial recs, replaces the queue, and begins playback.
 */
export default function StartStationButton({ seed, firstTrack, variant = 'icon', className }: Props) {
  const startStation = usePlayerStore((s) => s.startStation);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onClick = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const recs = await fetchRecs(seed, { limit: 12 });
      if (!recs.length && !firstTrack) {
        toast({ title: 'Not enough plays yet', description: 'Try again after a few listens.' });
        return;
      }
      startStation(seed, recs, firstTrack);
      trackEvent('station_started', {
        seed_type: seed.seedType,
        seed_id: seed.seedId,
        recs_count: recs.length,
      });
      toast({
        title: 'Station started',
        description: seed.seedName ? `Based on ${seed.seedName}` : 'Algorithmic radio is on.',
      });
    } catch {
      toast({ title: 'Could not start station', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'menuItem') {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white/90 hover:bg-white/10 rounded-md disabled:opacity-50 ${className ?? ''}`}
      >
        <Radio className="w-4 h-4" /> Start Station
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-semibold border border-white/15 text-white hover:bg-white/10 disabled:opacity-50 ${className ?? ''}`}
      >
        <Radio className="w-4 h-4" /> Start Station
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-label="Start station"
      title="Start station"
      className={`p-2 text-white/70 hover:text-white disabled:opacity-50 ${className ?? ''}`}
    >
      <Radio className="w-4 h-4" />
    </button>
  );
}
