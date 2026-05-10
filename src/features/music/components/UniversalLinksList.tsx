import { useUniversalLinks, UNIVERSAL_PLATFORMS } from "../hooks/useUniversalLinks";
import { ExternalLink } from "lucide-react";

interface Props {
  trackId: string;
}

/**
 * Song.link-style universal links list — one click opens the listener's
 * preferred external streaming platform.
 */
export default function UniversalLinksList({ trackId }: Props) {
  const { data: links = [], isLoading } = useUniversalLinks(trackId);

  if (isLoading) return <div className="h-20 rounded-xl bg-white/5 animate-pulse" />;
  if (!links.length) return null;

  return (
    <section className="rounded-xl bg-white/5 p-4 space-y-2">
      <h3 className="text-white font-bold text-sm mb-2">Listen anywhere</h3>
      {links.map((l) => {
        const meta = UNIVERSAL_PLATFORMS.find((p) => p.id === l.platform);
        return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-3 text-white"
            style={{ minHeight: 44 }}
          >
            <span className="text-sm font-medium">{meta?.name || l.platform}</span>
            <ExternalLink className="w-4 h-4 text-white/50" />
          </a>
        );
      })}
    </section>
  );
}
