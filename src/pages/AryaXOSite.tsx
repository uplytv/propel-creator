import { useEffect, useState } from "react";
import {
  Music2,
  Instagram,
  Youtube,
  Mail,
  Play,
  Sparkles,
  ArrowRight,
  Crown,
  MapPin,
  Calendar,
  Share2,
  Check,
  Copy,
  X,
} from "lucide-react";
import portraitAsset from "@/assets/arya-xo-150bands.png.asset.json";
import bgAsset from "@/assets/arya-xo-bg.png.asset.json";

const SHARE_URL = "https://uply.tv/arya-xo-site";

/**
 * Arya XO — full artist website, embedded inside UPLY.
 * A richer alternative to the link-card page at /arya-xo and a modern
 * replacement for the legacy litreeezy.com layout. Route: /arya-xo-site
 */

const portrait = portraitAsset.url;
const bg = bgAsset.url;

const RELEASES = [
  {
    title: "150 BANDS",
    feat: "HUGEL · NBA YoungBoy",
    year: "2026",
    tag: "New single",
    href: "https://open.spotify.com/search/150%20Bands%20Hugel",
  },
  {
    title: "Roy Woods collab",
    feat: "Arya XO × Roy Woods",
    year: "2025",
    tag: "Featured",
    href: "https://open.spotify.com/search/Arya%20XO%20Roy%20Woods",
  },
  {
    title: "TOO LIT",
    feat: "Official music video",
    year: "2024",
    tag: "Video",
    href: "https://www.youtube.com/watch?v=Datko9ejIHY",
  },
];

const VIDEOS = [
  { id: "Datko9ejIHY", title: "TOO LIT — Official Music Video" },
];

const MILESTONES = [
  { age: "17", text: "Opened for Trippie Redd, Lil Yachty & Tory Lanez" },
  { age: "21", text: "Linked with Roy Woods on a breakout collab" },
  { age: "22", text: "150 BANDS with HUGEL & NBA YoungBoy" },
];

export default function AryaXOSite() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    const prev = document.title;
    document.title = "Arya XO — Official Site · 150 BANDS w/ HUGEL & NBA YoungBoy";
    const setMeta = (sel: string, attr: string, name: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const desc =
      "Arya XO — official artist site. Singer & rapper behind '150 BANDS' with HUGEL & NBA YoungBoy. Music, videos, press and booking — powered by UPLY.";
    setMeta('meta[name="description"]', "name", "description", desc);
    setMeta('meta[property="og:title"]', "property", "og:title", "Arya XO — Official Site");
    setMeta('meta[property="og:description"]', "property", "og:description", desc);
    setMeta('meta[property="og:image"]', "property", "og:image", portrait);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00FF85]/30">
      {/* Sticky top bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2 font-heading font-extrabold tracking-tight">
            <Crown className="h-4 w-4 text-[#00FF85]" />
            ARYA <span className="text-[#00FF85]">XO</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-xs text-white/70">
            <a href="#music" className="hover:text-white">Music</a>
            <a href="#videos" className="hover:text-white">Videos</a>
            <a href="#about" className="hover:text-white">About</a>
            <a href="#booking" className="hover:text-white">Booking</a>
          </div>
          <a
            href="/arya-xo"
            className="text-[11px] rounded-full bg-white/10 hover:bg-white/15 px-3 py-1.5"
          >
            Links
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header id="top" className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center scale-110 blur-sm opacity-70"
          style={{ backgroundImage: `url(${bg})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/75 to-[#050505]" />

        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28 grid sm:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00FF85]/30 bg-[#00FF85]/10 px-3 py-1.5 text-[11px] text-[#00FF85]">
              <Sparkles className="h-3 w-3" /> Out now — 150 BANDS
            </div>
            <h1 className="mt-5 font-heading font-extrabold tracking-tight leading-[0.95] text-[44px] sm:text-[88px]">
              ARYA <span className="text-[#00FF85]">XO</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/75 max-w-xl">
              Singer · Rapper · Songwriter. From opening stages at 17 to club records
              with HUGEL and NBA YoungBoy at 22.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://open.spotify.com/search/150%20Bands%20Hugel"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#00FF85] px-5 py-3 text-sm font-bold text-black hover:brightness-110 transition"
              >
                <Play className="h-4 w-4 fill-black" /> Stream 150 BANDS
              </a>
              <a
                href="#booking"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10 transition"
              >
                <Mail className="h-4 w-4" /> Booking
              </a>
            </div>
          </div>

          <div className="relative mx-auto">
            <div className="absolute -inset-6 -z-10 rounded-full bg-[#00FF85]/20 blur-3xl" />
            <div className="h-64 w-64 sm:h-80 sm:w-80 rounded-3xl overflow-hidden ring-1 ring-white/15 shadow-[0_30px_80px_-20px_rgba(0,255,133,0.45)]">
              <img src={portrait} alt="Arya XO" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      {/* MUSIC / RELEASES */}
      <section id="music" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#00FF85]">Discography</p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">Latest releases</h2>
          </div>
          <a
            href="https://music.apple.com/us/artist/lit-reeezy/1597315016"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            Full catalog <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {RELEASES.map((r) => (
            <a
              key={r.title}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 hover:border-[#00FF85]/40 transition"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-black/40 ring-1 ring-white/10 mb-4 relative">
                <img src={portrait} alt={r.title} className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="h-12 w-12 rounded-full bg-[#00FF85] flex items-center justify-center shadow-lg">
                    <Play className="h-5 w-5 fill-black text-black" />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#00FF85]">
                <Sparkles className="h-3 w-3" /> {r.tag} · {r.year}
              </div>
              <div className="mt-1 font-heading text-xl font-bold">{r.title}</div>
              <div className="text-xs text-white/60">{r.feat}</div>
            </a>
          ))}
        </div>
      </section>

      {/* VIDEOS */}
      <section id="videos" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#00FF85]">Watch</p>
        <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">Music videos</h2>

        <div className="mt-8 grid gap-6">
          {VIDEOS.map((v) => (
            <div key={v.id} className="rounded-2xl overflow-hidden border border-white/10 bg-black">
              <div className="relative pb-[56.25%] h-0">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${v.id}`}
                  title={v.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="font-semibold">{v.title}</div>
                <a
                  href={`https://www.youtube.com/watch?v=${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1"
                >
                  Watch on YouTube <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT / STORY */}
      <section id="about" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
        <div className="grid sm:grid-cols-[1fr_1.2fr] gap-10 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#00FF85]">About</p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">The story so far</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/75">
              Arya XO is a 22-year-old singer and rapper whose sound bridges melodic
              trap, R&B and pop crossovers. Raised between Baltimore and Las Vegas,
              he comes from a family of musicians and stepped on stage before most
              kids step into middle school.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">
              At 17 he was opening for Trippie Redd, Lil Yachty and Tory Lanez. By
              22 he&apos;s in the studio with Roy Woods and on a global record with
              HUGEL and NBA YoungBoy — <span className="text-[#00FF85] font-semibold">150 BANDS</span>,
              built for the summer cycle.
            </p>
          </div>

          <ol className="relative border-l border-white/10 pl-6 space-y-6">
            {MILESTONES.map((m) => (
              <li key={m.age} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-[#00FF85] ring-4 ring-[#00FF85]/20" />
                <div className="text-[11px] uppercase tracking-wider text-white/50">Age {m.age}</div>
                <div className="mt-1 font-heading text-lg font-bold">{m.text}</div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { k: "Followers", v: "263K" },
            { k: "Streams", v: "Millions" },
            { k: "Co-signs", v: "HUGEL · NBA YB · Roy Woods" },
            { k: "Based in", v: "Las Vegas, NV" },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] uppercase tracking-wider text-white/50">{s.k}</div>
              <div className="mt-1 font-heading text-base font-bold">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BOOKING / CONTACT */}
      <section
        id="booking"
        className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5"
      >
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#00FF85]/15 via-white/[0.04] to-white/[0.02] p-8 sm:p-12">
          <div className="grid sm:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#00FF85]">Booking & press</p>
              <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">
                Bring Arya XO to your stage.
              </h2>
              <p className="mt-3 text-white/75 max-w-lg">
                Shows, features, sync, press and brand partnerships — send a note
                with the date, city and offer.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="mailto:booking@aryaxo.com"
                  className="inline-flex items-center gap-2 rounded-full bg-[#00FF85] px-5 py-3 text-sm font-bold text-black hover:brightness-110 transition"
                >
                  <Mail className="h-4 w-4" /> booking@aryaxo.com
                </a>
                <a
                  href="https://litreeezy.tunego.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10 transition"
                >
                  Download EPK
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <MapPin className="h-4 w-4 text-[#00FF85]" />
                <div className="mt-2 font-semibold">Touring from</div>
                <div className="text-white/60 text-xs">Las Vegas, NV — worldwide</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <Calendar className="h-4 w-4 text-[#00FF85]" />
                <div className="mt-2 font-semibold">Availability</div>
                <div className="text-white/60 text-xs">Now booking 2026</div>
              </div>
            </div>
          </div>
        </div>

        {/* Social row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {[
            { Icon: Instagram, label: "Instagram", href: "https://www.instagram.com/litreeezy/" },
            { Icon: Youtube, label: "YouTube", href: "https://www.youtube.com/@litreeezy653" },
            { Icon: Music2, label: "Apple Music", href: "https://music.apple.com/us/artist/lit-reeezy/1597315016" },
            { Icon: Music2, label: "Spotify", href: "https://open.spotify.com/search/Lit%20Reeezy" },
          ].map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <Icon className="h-4 w-4" /> {label}
            </a>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div>© {new Date().getFullYear()} Arya XO. All rights reserved.</div>
          <a href="/" className="hover:text-white/80 inline-flex items-center gap-2">
            Powered by <span className="font-heading font-bold text-white">UPLY</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
