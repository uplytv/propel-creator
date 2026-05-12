import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';
import PublicTrackPlayer from './PublicTrackPlayer';
import { usePlayerStore } from '../../hooks/usePlayerStore';

const sb = supabase as unknown as any;

interface Props { userId: string; mode: 'public' | 'app' }

function RemixCard({ track, mode, presaveSlug, queue }: { track: any; mode: 'public' | 'app'; presaveSlug?: string; queue: any[] }) {
  const loadTrack = usePlayerStore((s) => (s as any).loadTrack);
  return (
    <div className="flex-shrink-0 snap-start w-[260px] flex flex-col">
      {track.cover_art_url ? (
        <img src={track.cover_art_url} alt={track.title} className="w-full aspect-[3/4] rounded-2xl object-cover mb-3" />
      ) : (
        <div className="w-full aspect-[3/4] rounded-2xl mb-3" style={{ background: 'var(--bg-card)' }} />
      )}
      <div className="text-[16px] font-semibold mb-3 line-clamp-2">{track.title}</div>
      {presaveSlug ? (
        <Link
          to={`/presave/${presaveSlug}`}
          className="inline-flex items-center justify-center px-5 py-2 rounded-full text-[14px] font-semibold w-fit transition"
          style={{ border: '1px solid var(--text)' }}
        >
          Subscribe
        </Link>
      ) : mode === 'public' ? (
        <PublicTrackPlayer playbackId={track.audio_mux_playback_id} />
      ) : (
        <button
          type="button"
          onClick={() => loadTrack && loadTrack(track, queue)}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[14px] font-semibold w-fit transition"
          style={{ border: '1px solid var(--text)' }}
        >
          <Play className="w-4 h-4" /> Play
        </button>
      )}
    </div>
  );
}

export default function RemixesSection({ userId, mode }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: tracks = [] } = useQuery({
    queryKey: ['artistpage', 'remixes', userId],
    queryFn: async () => {
      const { data } = await sb.from('tracks').select('*').eq('creator_id', userId).eq('category', 'remix').eq('is_published', true).order('created_at', { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  const { data: presaves = [] } = useQuery({
    queryKey: ['artistpage', 'remix-presaves', userId, tracks.map((t: any) => t.id).join(',')],
    enabled: tracks.length > 0,
    queryFn: async () => {
      const ids = tracks.map((t: any) => t.id);
      const { data } = await sb.from('presave_campaigns').select('track_id, slug, status').in('track_id', ids).eq('status', 'active');
      return data ?? [];
    },
  });
  if (!tracks.length) return null;
  const presaveMap = new Map<string, string>(presaves.map((p: any) => [p.track_id, p.slug]));

  return (
    <section id="section-remixes" className="py-10 sm:py-16">
      <SectionHeader title="Remixes" scrollRef={scrollRef} />
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide">
        {tracks.map((t: any) => (
          <RemixCard key={t.id} track={t} mode={mode} presaveSlug={presaveMap.get(t.id)} queue={tracks} />
        ))}
      </div>
    </section>
  );
}
