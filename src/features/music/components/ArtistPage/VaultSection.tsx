import { Lock } from 'lucide-react';
import { useArtistVault } from '../../hooks/useArtistVault';
import LockedTrackPlayer from '../LockedTrackPlayer';
import SectionHeader from './SectionHeader';
import { useRef } from 'react';

interface Props {
  userId: string;
}

export default function VaultSection({ userId }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: tracks = [], isLoading } = useArtistVault(userId);

  if (!isLoading && tracks.length === 0) return null;

  return (
    <section id="section-vault" className="py-10 sm:py-16">
      <SectionHeader title="Vault" scrollRef={scrollRef} />
      <div className="px-6 mb-4 text-center">
        <p
          className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          <Lock className="w-3.5 h-3.5" /> Unreleased & locked tracks
        </p>
      </div>
      <div ref={scrollRef} className="max-w-[720px] mx-auto px-4 space-y-3">
        {tracks.map((t: any) => (
          <div
            key={t.id}
            className="rounded-2xl p-4"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              {t.cover_art_url ? (
                <img
                  src={t.cover_art_url}
                  alt={t.title}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <Lock className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {t.title}
                </div>
                <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {t.release_status === 'scheduled' && t.scheduled_release_at
                    ? `Releases ${new Date(t.scheduled_release_at).toLocaleDateString()}`
                    : 'Unreleased'}
                </div>
              </div>
            </div>
            <LockedTrackPlayer track={t} />
          </div>
        ))}
      </div>
    </section>
  );
}
