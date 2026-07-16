import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import ArtistSectionNav from "./ArtistSectionNav";
import ArtistDisclaimers from "./ArtistDisclaimers";
import { Check, Users } from "lucide-react";

export default function ArtistCommunityPage() {
  const { slug = "" } = useParams();
  const artist = ARTIST_ROSTER.find((a) => a.slug === slug || (a.aliases ?? []).includes(slug));

  useEffect(() => {
    if (artist) document.title = `${artist.displayName} — Community · UPLY`;
  }, [artist]);

  if (!artist || !artist.community) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-center">
          <p className="opacity-60">No community available.</p>
          <Link to="/" className="underline mt-2 inline-block">Back to UPLY</Link>
        </div>
      </main>
    );
  }

  const c = artist.community;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <ArtistSectionNav artist={artist} />
      <section
        className="px-6 pt-16 pb-12 text-center"
        style={{ background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)` }}
      >
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: artist.accent }}>
          Official community
        </p>
        <h1 className="mt-3 font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(40px, 8vw, 72px)" }}>
          {c.name}
        </h1>
        <p className="mt-4 max-w-xl mx-auto text-[16px] opacity-85">{c.description}</p>
        <p className="mt-5 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] opacity-70">
          <Users className="w-4 h-4" /> {c.membersLabel}
        </p>
      </section>

      <div className="max-w-[720px] mx-auto px-6 py-14">
        <div className="rounded-3xl p-6 sm:p-8 bg-white/5 border border-white/10">
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
            <h2 className="text-xl font-semibold">What members get</h2>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: artist.accent }}>
                {c.priceUsd === 0 ? "Free" : `$${c.priceUsd}`}
              </div>
              {c.priceUsd > 0 && <div className="text-[12px] opacity-60">per month</div>}
            </div>
          </div>
          <ul className="space-y-3 mb-8">
            {c.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3">
                <span
                  className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${artist.accent}33`, color: artist.accent }}
                >
                  <Check className="w-3 h-3" />
                </span>
                <span className="text-[15px] opacity-90">{perk}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/auth"
            className="block text-center px-6 py-3.5 rounded-full font-semibold transition-transform hover:scale-[1.01]"
            style={{ background: artist.accent, color: "#0a0a0a" }}
          >
            Join {c.name}
          </Link>
          <p className="mt-3 text-center text-[11px] opacity-50">
            Powered by UPLY · cancel anytime
          </p>
          <ArtistDisclaimers artist={artist} className="mt-5 pt-4 border-t border-white/10" />
        </div>
      </div>
    </main>
  );
}
