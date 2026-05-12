import { ChevronLeft, ChevronRight, RefObject } from 'lucide-react';
import type { RefObject as ReactRefObject } from 'react';

interface Props {
  title: string;
  scrollRef?: ReactRefObject<HTMLDivElement>;
  rightSlot?: React.ReactNode;
}

export default function SectionHeader({ title, scrollRef, rightSlot }: Props) {
  const scroll = (dir: 'l' | 'r') => {
    const el = scrollRef?.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'l' ? -400 : 400, behavior: 'smooth' });
  };
  return (
    <div className="flex items-center justify-between mb-6 px-6 max-w-[1200px] mx-auto">
      <h2 className="font-bold" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>{title}</h2>
      <div className="flex items-center gap-2">
        {rightSlot}
        {scrollRef && (
          <>
            <button
              type="button"
              onClick={() => scroll('l')}
              aria-label="Scroll left"
              className="w-10 h-10 rounded-full flex items-center justify-center transition"
              style={{ border: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll('r')}
              aria-label="Scroll right"
              className="w-10 h-10 rounded-full flex items-center justify-center transition"
              style={{ border: '1px solid var(--border)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
