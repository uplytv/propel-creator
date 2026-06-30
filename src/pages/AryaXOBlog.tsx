import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import portraitAsset from "@/assets/arya-xo-portrait-v3.jpg.asset.json";
import bandsCoverAsset from "@/assets/150bands-cover.jpg.asset.json";
import BackButton from "@/components/common/BackButton";

/**
 * Arya XO — feature blog post.
 * Long-form editorial piece on the 150 BANDS release.
 * Route: /arya-xo/blog and /arya-xo-blog
 */
export default function AryaXOBlog() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-body">
      <BackButton fallback="/arya-xo-site" />

      {/* Top bar */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-black/60 border-b border-white/5">
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center justify-between">
          <Link
            to="/arya-xo-site"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Arya XO
          </Link>
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            Feature · Summer 2026
          </span>
        </div>
      </div>

      {/* HERO */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center scale-110 blur-2xl opacity-50"
          style={{ backgroundImage: `url(${portraitAsset.url})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/85 to-[#050505]" />

        <div className="mx-auto max-w-3xl px-5 pt-14 pb-12 sm:pt-20 sm:pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.25em] text-white/70">
            <Sparkles className="h-3 w-3 text-[#00FF85]" /> The Come-Up · Aryaxo · 2026
          </div>
          <h1 className="mt-6 font-heading font-extrabold tracking-tight leading-[0.95] text-4xl sm:text-6xl">
            Twenty-two, and{" "}
            <span className="italic text-[#00FF85]">writing his own lane.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-white/75 max-w-2xl mx-auto">
            An Iranian-American kid who opened for the biggest names in rap at
            seventeen just landed the loudest crossover record of the summer —
            on his own terms.
          </p>
          <p className="mt-5 text-[11px] uppercase tracking-[0.25em] text-white/40">
            Words by The Rhythm Desk · 8 min read
          </p>

          <div className="mt-10 mx-auto h-80 sm:h-[28rem] w-full max-w-2xl rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-[0_40px_120px_-30px_rgba(0,255,133,0.45)]">
            <img
              src={portraitAsset.url}
              alt="Arya XO portrait"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
      </header>

      {/* BODY */}
      <article className="mx-auto max-w-2xl px-5 pb-24 text-[17px] leading-[1.75] text-white/85 space-y-6">
        <p className="text-2xl sm:text-3xl font-heading font-bold text-white leading-snug">
          Some artists wait years for a moment like this. He went and built one.
        </p>

        <p>
          Meet <strong className="text-white">AryaXO</strong> — a
          twenty-two-year-old Iranian-American rapper, singer and actor who has
          spent the last five years quietly stacking the kind of résumé most
          artists chase for a decade. He isn&apos;t a viral accident or an
          overnight name. He&apos;s the result of showing up early, taking the
          hard reps, and refusing to sound like anyone else.
        </p>

        <p>
          Rewind to seventeen. While most kids his age were figuring out senior
          year, AryaXO was already standing on real stages —{" "}
          <strong className="text-white">
            opening for Lil Yachty, Tory Lanez and Trippie Redd
          </strong>
          . Not a feature swap, not a hometown showcase. Opening slots for
          headliners, in front of crowds that came hard to impress. That&apos;s
          where the instincts got sharpened: how to hold a room, how to ride a
          beat that isn&apos;t built for you, how to make three minutes feel
          like yours.
        </p>

        {/* Record card */}
        <div className="my-10 rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03]">
          <div className="aspect-square sm:aspect-[16/10] bg-black">
            <img
              src={bandsCoverAsset.url}
              alt="150 Bands cover art"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#00FF85]">
              The Record · Out Now · Track 02
            </p>
            <h2 className="mt-2 font-heading text-4xl sm:text-5xl font-extrabold">
              150 Bands
            </h2>
            <p className="mt-2 text-white/70">
              HUGEL × YoungBoy Never Broke Again × AryaXO — from the album{" "}
              <span className="italic">Twenty One</span>
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/50">
                  Album
                </dt>
                <dd className="mt-1 font-semibold">Twenty One — HUGEL</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/50">
                  Released
                </dt>
                <dd className="mt-1 font-semibold">June 26, 2026</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/50">
                  Sound
                </dt>
                <dd className="mt-1 font-semibold">
                  Afro House · Latin House · Hip-Hop
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-white/50">
                  Tempo / Key
                </dt>
                <dd className="mt-1 font-semibold">123 BPM · B♭ minor</dd>
              </div>
            </dl>
          </div>
        </div>

        <p>
          This is the one. <strong className="text-white">&ldquo;150 Bands&rdquo;</strong>{" "}
          sits as the second track on HUGEL&apos;s{" "}
          <span className="italic">Twenty One</span>, the French hitmaker&apos;s
          sprawling, star-stacked 2026 album — a record that runs from Snoop
          Dogg to David Guetta to Big Sean and Scott Storch. And right there
          near the front of it, sharing the credit with YoungBoy Never Broke
          Again, is AryaXO.
        </p>

        <p>
          The sound is the story. &ldquo;150 Bands&rdquo; doesn&apos;t pick a
          side — it fuses{" "}
          <strong className="text-white">
            hip-hop, Afro House and Latin House
          </strong>{" "}
          into one moving thing: the swagger and bite of Baton Rouge cadence
          riding HUGEL&apos;s club-built, sun-soaked, Mediterranean groove.
          It&apos;s a record made for the moment the festival sky goes purple
          and forty thousand people decide to lose their minds at once.
        </p>

        <div className="flex flex-wrap gap-2 py-2">
          {["Hip-Hop", "Afro House", "Latin House", "Festival", "Crossover"].map(
            (t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[11px] uppercase tracking-wider text-white/80"
              >
                {t}
              </span>
            ),
          )}
        </div>

        <p>
          That blend is exactly where dance music is heading in 2026. The walls
          between rap and the main stage are gone, and the artists who can live
          in both rooms at once are the ones setting the direction. AryaXO
          didn&apos;t follow that trend onto the record — he helped write it
          into the biggest crossover release of the season.
        </p>

        <p>
          What makes this more than a lucky placement is the path behind it.
          The opening slots at seventeen. The acting. The singer&apos;s ear
          layered under the rapper&apos;s cadence. A heritage — Iranian melody
          and rhythm — that quietly shapes how he hears a hook. None of it is
          borrowed. He&apos;s been assembling a sound that only he could make,
          and &ldquo;150 Bands&rdquo; is the first time the whole world gets to
          hear it click into place next to one of dance music&apos;s biggest
          names.
        </p>

        <p className="text-xl font-heading font-bold text-white leading-snug pt-4">
          This is what carving your own lane actually looks like: not waiting
          to be picked, but building the thing that makes you impossible to
          ignore.
        </p>

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#00FF85]">
            Summer 2026 · The Rhythm of Everything
          </p>
          <h3 className="mt-2 font-heading text-3xl font-extrabold">ARYAXO</h3>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="https://open.spotify.com/track/3QBkhZL0nUSrm6qcoSEZvt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00FF85] text-black font-bold text-sm"
            >
              Stream 150 Bands
            </a>
            <Link
              to="/arya-xo-site#booking"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 bg-white/5 text-white font-bold text-sm hover:bg-white/10"
            >
              Book Arya XO
            </Link>
            <Link
              to="/arya-xo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 bg-white/5 text-white font-bold text-sm hover:bg-white/10"
            >
              All links
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
