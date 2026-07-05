import { Crown } from "lucide-react";

/** Gold, square "Founding Creator" badge. Renders nothing unless flagged. */
export default function FoundingCreatorBadge({ show, className = "" }: { show?: boolean | null; className?: string }) {
  if (!show) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border border-gold-hairline bg-[hsl(var(--gold)/0.12)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold ${className}`}
      title="Founding Creator — here since the beginning"
    >
      <Crown className="w-3 h-3" /> Founding Creator
    </span>
  );
}
