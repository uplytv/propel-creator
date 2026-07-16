import type { ArtistRosterEntry } from "@/data/artistRoster";

/**
 * Footer-level compliance lines for roster artists in regulated niches
 * (e.g. trading "not financial advice", sports betting "21+ · bet
 * responsibly"). Renders nothing for artists without `disclaimers`,
 * so existing roster pages are unaffected.
 */
export default function ArtistDisclaimers({
  artist,
  className = "",
}: {
  artist: ArtistRosterEntry;
  className?: string;
}) {
  if (!artist.disclaimers || artist.disclaimers.length === 0) return null;
  return (
    <div className={`space-y-1.5 ${className}`}>
      {artist.disclaimers.map((line) => (
        <p key={line} className="text-[11px] leading-relaxed text-center opacity-50">
          {line}
        </p>
      ))}
    </div>
  );
}
