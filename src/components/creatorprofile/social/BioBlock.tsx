import { useState } from "react";

interface Props {
  bio?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

const URL_RE = /(https?:\/\/[^\s]+)/g;

function autolink(text: string) {
  const out: (string | JSX.Element)[] = [];
  let i = 0;
  text.replace(URL_RE, (m, _u, off) => {
    if (off > i) out.push(text.slice(i, off));
    out.push(
      <a
        key={`l-${off}`}
        href={m}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline decoration-primary/40 hover:decoration-primary"
      >
        {m.replace(/^https?:\/\//, "")}
      </a>,
    );
    i = off + m.length;
    return m;
  });
  if (i < text.length) out.push(text.slice(i));
  return out;
}

export default function BioBlock({ bio, ctaLabel, ctaUrl }: Props) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = (bio || "").trim();
  if (!trimmed && !ctaUrl) return null;

  const isLong = trimmed.length > 140 || trimmed.includes("\n");

  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 mt-4">
      {trimmed && (
        <p
          className={
            "text-sm sm:text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap " +
            (expanded ? "" : "line-clamp-2")
          }
        >
          {autolink(trimmed)}
        </p>
      )}
      {isLong && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-sm font-medium text-primary hover:underline min-h-[44px]"
        >
          more
        </button>
      )}
      {ctaUrl && ctaLabel && (
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 min-h-[44px]"
        >
          {ctaLabel}
        </a>
      )}
    </section>
  );
}
