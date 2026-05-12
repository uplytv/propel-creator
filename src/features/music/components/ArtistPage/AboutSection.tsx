import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AboutSection({ aboutMd }: { aboutMd?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!aboutMd) return null;
  const long = aboutMd.length > 500;
  const display = open || !long ? aboutMd : aboutMd.slice(0, 500) + '…';
  return (
    <section id="section-about" className="py-10 sm:py-16">
      <div className="max-w-[800px] mx-auto px-6">
        <h2 className="font-bold mb-6" style={{ fontSize: 'clamp(28px, 4vw, 36px)' }}>About</h2>
        <div className="prose prose-invert max-w-none text-[16px] leading-relaxed" style={{ color: 'var(--text)' }}>
          <ReactMarkdown>{display}</ReactMarkdown>
        </div>
        {long && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-4 text-[14px] underline-offset-4 hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            {open ? 'Read less' : 'Read more'}
          </button>
        )}
      </div>
    </section>
  );
}
