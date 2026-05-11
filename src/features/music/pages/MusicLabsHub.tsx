import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

/**
 * MusicLabsHub — single index page that links to every music sub-page.
 * This is the audit/wire-up surface so all 100+ batches built into
 * `src/features/music/pages` are reachable from one place.
 */

interface Entry {
  label: string;
  to: string;
  group: string;
  note?: string;
}

const ENTRIES: Entry[] = [
  // Discovery
  { group: "Discovery", label: "Music Home", to: "/music" },
  { group: "Discovery", label: "Browse", to: "/music/browse" },
  { group: "Discovery", label: "Search", to: "/music/search" },
  { group: "Discovery", label: "Charts", to: "/music/charts" },
  { group: "Discovery", label: "Live Now", to: "/music/live" },
  { group: "Discovery", label: "Activity Feed", to: "/music/feed" },
  { group: "Discovery", label: "Notifications", to: "/music/notifications" },
  // Library / Personal
  { group: "Library", label: "My Library", to: "/music/library" },
  { group: "Library", label: "Smart Playlists", to: "/music/smart-playlists" },
  { group: "Library", label: "Group Blends", to: "/music/blends" },
  { group: "Library", label: "Podcast", to: "/music/podcast" },
  // Listening
  { group: "Listening", label: "Karaoke", to: "/music/karaoke" },
  { group: "Listening", label: "Lyrics Sync", to: "/music/lyrics-sync" },
  { group: "Listening", label: "DJ Console", to: "/music/dj" },
  { group: "Listening", label: "Long-form Player", to: "/music/longform" },
  { group: "Listening", label: "Fan Radio", to: "/music/radio-player" },
  // Live & Events
  { group: "Events", label: "Concerts", to: "/music/concerts" },
  { group: "Events", label: "Tour Calendar", to: "/music/tour" },
  { group: "Events", label: "Tour Merch", to: "/music/tour-merch" },
  { group: "Events", label: "Booking Inquiries", to: "/music/booking" },
  // Monetize
  { group: "Monetize", label: "Distribution", to: "/music/distribution" },
  { group: "Monetize", label: "Royalty Payouts", to: "/music/royalties" },
  { group: "Monetize", label: "Publishing", to: "/music/publishing" },
  { group: "Monetize", label: "Split Sheets", to: "/music/splits" },
  { group: "Monetize", label: "Sync Licensing", to: "/music/sync" },
  { group: "Monetize", label: "Stem Marketplace", to: "/music/stems" },
  { group: "Monetize", label: "Sample Packs", to: "/music/samples" },
  { group: "Monetize", label: "NFT Drops", to: "/music/nft-drops" },
  { group: "Monetize", label: "Merch Bundles", to: "/music/merch-bundles" },
  { group: "Monetize", label: "Super Thanks", to: "/music/super-thanks" },
  // Creator tools
  { group: "Creator", label: "Upload", to: "/music/upload" },
  { group: "Creator", label: "Collab Studio", to: "/music/collab" },
  { group: "Creator", label: "Gig Marketplace", to: "/music/gigs" },
  { group: "Creator", label: "Artist Verification", to: "/music/verify" },
  { group: "Creator", label: "Creator Analytics", to: "/music/creator-analytics" },
  { group: "Creator", label: "Analytics", to: "/music/analytics" },
  // Connect
  { group: "Connect", label: "DSP Connections", to: "/music/connections" },
  { group: "Connect", label: "Artist Profile", to: "/music/artist/me" },
  { group: "Connect", label: "Track Insights", to: "/music/track/me/insights", note: "Open from a track you own" },
];

const GROUPS = [
  "Discovery",
  "Library",
  "Listening",
  "Events",
  "Monetize",
  "Creator",
  "Connect",
];

export default function MusicLabsHub() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-32">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Music
        </Link>
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs text-[#00FF85] uppercase tracking-wider font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Music Labs
          </div>
          <h1 className="text-3xl sm:text-4xl font-black">Every music feature, one map.</h1>
          <p className="text-white/60 mt-2 text-sm">
            Reach every page in the music module — discovery, monetization, distribution, and creator tools.
          </p>
        </header>

        {GROUPS.map((g) => {
          const items = ENTRIES.filter((e) => e.group === g);
          return (
            <section key={g} className="mb-8">
              <h2 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3">{g}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {items.map((e) => (
                  <Link
                    key={e.to}
                    to={e.to}
                    className="rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 px-4 py-3 text-sm font-medium transition-colors"
                    style={{ minHeight: 56 }}
                  >
                    {e.label}
                    <div className="text-[11px] text-white/40 mt-0.5">{e.to}</div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
