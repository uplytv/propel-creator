import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';
import PublicTrackPlayer from './PublicTrackPlayer';
import { usePlayerStore } from '../../hooks/usePlayerStore';

const sb = supabase as unknown as any;

interface Props { userId: string; mode: 'public' | 'app' }

function DJSetCard({ track, mode, queue }: { track: any; mode: 'public' | 'app'; queue: any[] }) {
  const loadTrack = usePlayerStore((s) => (s as any).loadTrack);
  const [showPublic, setShowPublic] = useState(false);
  return (
    <div className="flex-shrink-0 snap-start w-[420px] max-w-[85vw]">
      <div
        className="w-full aspect-video rounded-2xl overflow-hidden relative cursor-pointer group"
        style={{ background: 'var(--bg-card)' }}
        onClick={() => mode === 'app' ? loadTrack && loadTrack(track, queue) : setShowPublic(true)}
      >
        {track.cover_art_url && (
          <img src={track.cover_art_url} alt={track.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full backdrop-blur flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.20)' }}>
            <Play className="w-7 h-7 text-white fill-white" />
          </div>
        </div>
      </div>
      <div className="mt-3 text-[16px] font-semibold line-clamp-2">{track.title}</div>
      {mode === 'public' && showPublic && (
        <div className="mt-2"><PublicTrackPlayer playbackId={track.audio_mux_playback_id} /></div>
      )}
    </div>
  );
}

export default function DJSetsSection({ userId, mode }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: tracks = [] } = useQuery({
    queryKey: ['artistpage', 'djsets', userId],
    queryFn: async () => {
      const { data } = await sb.from('tracks').select('*').eq('creator_id', userId).in('category', ['dj_set', 'live_set']).eq('is_published', true).order('created_at', { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  if (!tracks.length) return null;

  return (
    <section id="section-djsets" className="py-10 sm:py-16">
      <SectionHeader title="DJ Sets" scrollRef={scrollRef} />
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide">
        {tracks.map((t: any) => (
          <DJSetCard key={t.id} track={t} mode={mode} queue={tracks} />
        ))}
      </div>
    </section>
  );
}
