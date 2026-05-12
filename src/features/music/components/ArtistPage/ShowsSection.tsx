import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';

const sb = supabase as unknown as any;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function ShowCard({ ev, past }: { ev: any; past?: boolean }) {
  const d = new Date(ev.starts_at);
  const handle = () => {
    const url = ev.ticket_url || (ev.slug ? `/events/${ev.slug}` : null);
    if (url) {
      if (url.startsWith('http')) window.open(url, '_blank');
      else window.location.href = url;
    }
  };
  return (
    <div
      className="flex-shrink-0 snap-start w-[480px] max-w-[85vw] rounded-2xl p-6 flex gap-6 items-center transition"
      style={{ background: 'var(--bg-card)', opacity: past ? 0.55 : 1 }}
      onMouseEnter={(e) => !past && (e.currentTarget.style.background = 'var(--bg-card-hover)')}
      onMouseLeave={(e) => !past && (e.currentTarget.style.background = 'var(--bg-card)')}
    >
      <div className="w-[140px] flex-shrink-0 rounded-2xl p-4 text-center" style={{ border: '1px solid var(--border)' }}>
        <div className="text-[14px] uppercase tracking-wider opacity-70">{MONTHS[d.getMonth()]}</div>
        <div className="text-[64px] font-bold leading-none my-1">{d.getDate()}</div>
        <div className="text-[14px] opacity-70">{d.getFullYear()}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[20px] font-semibold mb-2 line-clamp-2">{ev.title}</div>
        {(ev.location_name || ev.location_city) && (
          <div className="text-[15px] mb-4 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {[ev.location_name, ev.location_city, ev.location_state].filter(Boolean).join(', ')}
          </div>
        )}
        {!past && (
          <button
            type="button"
            onClick={handle}
            className="inline-flex items-center px-5 py-2 rounded-full text-[14px] font-semibold transition"
            style={{ border: '1px solid var(--text)' }}
          >
            Tickets
          </button>
        )}
      </div>
    </div>
  );
}

export default function ShowsSection({ userId }: { userId: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPast, setShowPast] = useState(false);

  const { data: upcoming = [] } = useQuery({
    queryKey: ['artistpage', 'shows-upcoming', userId],
    queryFn: async () => {
      const { data } = await sb.from('events').select('*').eq('creator_id', userId).gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: true }).limit(20);
      return data ?? [];
    },
  });
  const { data: past = [] } = useQuery({
    queryKey: ['artistpage', 'shows-past', userId, showPast],
    enabled: showPast,
    queryFn: async () => {
      const { data } = await sb.from('events').select('*').eq('creator_id', userId).lt('starts_at', new Date().toISOString()).order('starts_at', { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  if (!upcoming.length && !past.length) return null;

  return (
    <section id="section-shows" className="py-10 sm:py-16">
      <SectionHeader title="Shows" scrollRef={scrollRef} />
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide">
        {upcoming.map((ev: any) => <ShowCard key={ev.id} ev={ev} />)}
      </div>
      <div className="text-center mt-4 px-6">
        <button
          type="button"
          onClick={() => setShowPast((s) => !s)}
          className="text-[14px] underline-offset-4 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          {showPast ? 'Hide past shows' : 'View past shows'}
        </button>
      </div>
      {showPast && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 mt-6 max-w-[1200px] mx-auto">
          {past.map((ev: any) => <ShowCard key={ev.id} ev={ev} past />)}
        </div>
      )}
    </section>
  );
}
