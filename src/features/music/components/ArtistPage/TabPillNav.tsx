import { useState } from 'react';

interface Tab { id: string; label: string }

interface Props {
  tabs: Tab[];
  onSelect?: (id: string) => void;
}

export default function TabPillNav({ tabs, onSelect }: Props) {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? '');
  if (!tabs.length) return null;
  const handle = (id: string) => {
    setActive(id);
    onSelect?.(id);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav className="flex flex-wrap gap-3 justify-center pt-2 pb-12 px-6">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handle(t.id)}
            className="px-5 py-2 rounded-full text-[15px] font-semibold transition"
            style={{
              border: isActive ? '1px solid var(--text)' : '1px solid transparent',
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              background: 'transparent',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
