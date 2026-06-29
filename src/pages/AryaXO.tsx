import { useEffect } from "react";
import {
  Music2,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Mail,
  FileText,
  ExternalLink,
  Play,
  Sparkles,
} from "lucide-react";
import portraitAsset from "@/assets/arya-xo-150bands.png.asset.json";
import bgAsset from "@/assets/arya-xo-bg.png.asset.json";
import AryaBandsAutoplay from "@/components/AryaBandsAutoplay";

/**
 * Arya XO — public artist showcase, embedded inside UPLY.
 * Replaces the user's Linktree with a richer, on-brand page:
 *   • Cinematic hero (his portrait + name + bio)
 *   • Featured track card for "150 BANDS" w/ HUGEL & NBA YoungBoy
 *   • Story / press blurb
 *   • Streaming + social links as tappable cards
 *   • Powered-by-UPLY footer
 *
 * Self-contained, frontend-only — no DB writes, no auth.
 * Route: /arya-xo (mounted in App.tsx above the /:username catch-all).
 */

const portrait = portraitAsset.url;
const bg = bgAsset.url;

type LinkCard = {
  label: string;
  sub?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // tailwind bg class for the icon chip
  featured?: boolean;
};

const LINKS: LinkCard[] = [
  {
    label: "Spotify",
    sub: "Listen on Spotify",
    href: "https://open.spotify.com/search/Lit%20Reeezy",
    icon: Music2,
    accent: "bg-[#1DB954]",
  },
  {
    label: "Apple Music",
    sub: "Lit Reeezy — verified artist",
    href: "https://music.apple.com/us/artist/lit-reeezy/1597315016",
    icon: Music2,
    accent: "bg-gradient-to-br from-[#FA243C] to-[#FB5C74]",
  },
  {
    label: "SoundCloud",
    sub: "Latest drops & loosies",
    href: "https://soundcloud.com/search?q=Lit%20Reeezy",
    icon: Music2,
    accent: "bg-[#FF5500]",
  },
  {
    label: "YouTube — Music Videos",
    sub: "@litreeezy653 · 8K subscribers",
    href: "https://www.youtube.com/@litreeezy653",
    icon: Youtube,
    accent: "bg-[#FF0033]",
  },
  {
    label: "Instagram",
    sub: "@litreeezy · 263K followers",
    href: "https://www.instagram.com/litreeezy/",
    icon: Instagram,
    accent: "bg-gradient-to-br from-[#FEDA75] via-[#FA7E1E] to-[#D62976]",
  },
  {
    label: "Facebook",
    sub: "Arya Shahbazy",
    href: "https://www.facebook.com/search/top?q=Arya%20Shahbazy",
    icon: Facebook,
    accent: "bg-[#1877F2]",
  },
  {
    label: "EPK",
    sub: "Press kit — bio, photos, collectibles",
    href: "https://litreeezy.tunego.com/",
    icon: FileText,
    accent: "bg-white/10",
  },
  {
    label: "Website",
    sub: "litreeezy.com",
    href: "https://litreeezy.com/",
    icon: Globe,
    accent: "bg-white/10",
  },
  {
    label: "Booking & Press",
    sub: "Inquiries via official site",
    href: "https://litreeezy.com/#contact",
    icon: Mail,
    accent: "bg-white/10",
  },
];


export default function AryaXO() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    const prevTitle = document.title;
    document.title = "Arya XO — Singer, Rapper · 150 BANDS w/ HUGEL & NBA YoungBoy";
    const setMeta = (selector: string, attr: string, name: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };
    const desc =
      "Arya XO — 22-year-old Iranian American rapper, singer & actor. From opening for Trippie Redd, Lil Yachty and Tory Lanez at 17 to dropping the summer's track '150 BANDS' with HUGEL and NBA YoungBoy. Listen, watch and follow on UPLY.";
    setMeta('meta[name="description"]', "name", "description", desc);
    setMeta('meta[property="og:title"]', "property", "og:title", "Arya XO — 150 BANDS out now");
    setMeta('meta[property="og:description"]', "property", "og:description", desc);
    setMeta('meta[property="og:image"]', "property", "og:image", "https://uply.tv/arya-xo-og.png");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-[#00FF85]/30">
      <AryaBandsAutoplay />



      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${bg})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/70 to-[#070707]"
          aria-hidden
        />

        <div className="mx-auto max-w-[680px] px-5 pt-14 pb-10 sm:pt-20 sm:pb-14 text-center">
          <div className="mx-auto h-32 w-32 sm:h-40 sm:w-40 rounded-full ring-2 ring-white/20 shadow-[0_20px_60px_-10px_rgba(0,255,133,0.35)] overflow-hidden">
            <img
              src={portrait}
              alt="Arya XO portrait"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>

          <h1 className="mt-6 font-heading text-4xl sm:text-5xl font-extrabold tracking-tight">
            ARYA <span className="text-[#00FF85]">XO</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-white/80">
            Artist · Singer · Songwriter · Actor
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00FF85] animate-pulse" />
            New: 150 BANDS — HUGEL × Arya XO × NBA YoungBoy
          </div>
        </div>
      </header>

      {/* ── Featured track ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-[680px] px-5 -mt-2">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#00FF85]/20 via-white/5 to-white/[0.02] p-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl bg-black/50 ring-1 ring-white/15 flex items-center justify-center">
              <Play className="h-7 w-7 text-[#00FF85] fill-[#00FF85]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[#00FF85]">
                <Sparkles className="h-3 w-3" /> New single
              </div>
              <div className="mt-1 font-heading text-xl sm:text-2xl font-bold truncate">
                150 BANDS
              </div>
              <div className="text-xs sm:text-sm text-white/70 truncate">
                HUGEL · Arya XO · NBA YoungBoy
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Spotify", href: "https://open.spotify.com/track/3QBkhZL0nUSrm6qcoSEZvt", bg: "bg-[#1DB954] text-black" },
              { label: "Apple Music", href: "https://music.apple.com/us/song/150-bands/6778877438", bg: "bg-white text-black" },
              { label: "YouTube", href: "https://www.youtube.com/watch?v=gqYburgfJ9s", bg: "bg-[#FF0000] text-white" },
            ].map((p) => (
              <a
                key={p.label}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl min-h-[44px] px-3 text-xs sm:text-sm font-semibold ${p.bg} hover:opacity-90 transition`}
              >
                <Play className="h-3.5 w-3.5 fill-current" /> {p.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Links ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[680px] px-5 py-6">
        <ul className="flex flex-col gap-2.5">
          {LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 min-h-[64px] rounded-2xl border border-white/10 bg-white/[0.04] px-3 hover:bg-white/[0.07] hover:border-white/20 transition"
                >
                  <span
                    className={`h-11 w-11 rounded-xl ${l.accent} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm sm:text-base font-semibold text-white truncate">
                      {l.label}
                    </span>
                    {l.sub && (
                      <span className="block text-[11px] sm:text-xs text-white/55 truncate">
                        {l.sub}
                      </span>
                    )}
                  </span>
                  <ExternalLink className="h-4 w-4 text-white/40 shrink-0" />
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Story / EPK ──────────────────────────────────────────────── */}
      <section id="epk" className="mx-auto max-w-[680px] px-5 py-10 sm:py-14">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold">The story</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/80">
            Arya XO is a 22-year-old <span className="text-white font-semibold">Iranian American</span>{" "}
            rapper, singer and actor whose sound moves between melodic R&B and
            pop-leaning crossovers. He started early — opening at{" "}
            <span className="text-white font-semibold">17</span> for{" "}
            <span className="text-white font-semibold">Trippie Redd</span>,{" "}
            <span className="text-white font-semibold">Lil Yachty</span> and{" "}
            <span className="text-white font-semibold">Tory Lanez</span> — and
            spent the years since turning stage time into studio time.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">
            In 2025 he linked with <span className="text-white font-semibold">Roy Woods</span>{" "}
            on a release that pushed his catalog into a new lane, then dropped
            the track of the summer — <span className="text-[#00FF85] font-semibold">"150 BANDS"</span>{" "}
            alongside <span className="text-white font-semibold">HUGEL</span> and{" "}
            <span className="text-white font-semibold">NBA YoungBoy</span>.
          </p>

          <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <dt className="text-[10px] uppercase tracking-wider text-white/50">Followers</dt>
              <dd className="mt-1 font-heading text-lg font-bold text-white">263K</dd>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <dt className="text-[10px] uppercase tracking-wider text-white/50">YouTube</dt>
              <dd className="mt-1 font-heading text-lg font-bold text-white">8K</dd>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <dt className="text-[10px] uppercase tracking-wider text-white/50">Est. since</dt>
              <dd className="mt-1 font-heading text-lg font-bold text-white">2020</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2 text-[11px]">
            {[
              "Opened for Trippie Redd",
              "Opened for Lil Yachty",
              "Opened for Tory Lanez",
              "Collab — Roy Woods",
              "Collab — HUGEL",
              "Collab — NBA YoungBoy",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-white/80"
              >
                {tag}
              </span>
            ))}
          </div>

          <a
            href="mailto:booking@aryaxo.com"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#00FF85] px-5 py-3 text-sm font-bold text-black hover:brightness-110 transition"
          >
            <Mail className="h-4 w-4" /> Booking & press inquiries
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-[680px] px-5 pb-12 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition"
        >
          Powered by <span className="font-heading font-bold text-white">UPLY</span>
        </a>
      </footer>
    </div>
  );
}
