import { useEffect, useMemo, useState } from "react";
import {
  Music2,
  Instagram,
  Youtube,
  Mail,
  Play,
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  Share2,
  Check,
  Copy,
  X,
  Loader2,
  DollarSign,
  Users,
  Send,
  ThumbsUp,
} from "lucide-react";
import portraitAsset from "@/assets/arya-xo-150bands.png.asset.json";
import bgAsset from "@/assets/arya-xo-bg.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import AryaBandsAutoplay from "@/components/AryaBandsAutoplay";
import { buildAryaOgImageUrl, buildAryaShareUrl, currentOgVersion } from "@/lib/aryaShare";

const SHARE_PATH = "/arya-xo-site";
const ARTIST_SLUG = "arya-xo";

/**
 * Arya XO — full artist website, embedded inside UPLY.
 * Booking inquiries land directly in Uply's `public_booking_inquiries` table
 * (acts as a lightweight CRM). Route: /arya-xo-site
 */

const portrait = portraitAsset.url;
const bg = bgAsset.url;
const ARYA_OG_IMAGE = "https://uply.tv/arya-xo-og-v2.png";

const RELEASES = [
  {
    title: "150 BANDS",
    feat: "HUGEL · NBA YoungBoy — from the album '21'",
    year: "2026",
    tag: "New single",
    href: "https://open.spotify.com/track/3QBkhZL0nUSrm6qcoSEZvt",
  },

  {
    title: "Get Down",
    feat: "Arya XO ft. Roy Woods",
    year: "2025",
    tag: "Featured",
    href: "https://open.spotify.com/search/Arya%20XO%20Get%20Down%20Roy%20Woods",
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

const EVENT_TYPES = [
  "Club / Live Show",
  "Festival",
  "Private / Corporate",
  "Brand Activation",
  "Feature / Studio Session",
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
      "Arya XO — official site. The 22-year-old artist behind '150 BANDS' with HUGEL & NBA YoungBoy. Music, videos, press and direct booking.";
    setMeta('meta[name="description"]', "name", "description", desc);
    setMeta('meta[property="og:title"]', "property", "og:title", "Arya XO — Official Site");
    setMeta('meta[property="og:description"]', "property", "og:description", desc);
    setMeta('meta[property="og:image"]', "property", "og:image", ARYA_OG_IMAGE);
    setMeta('meta[property="og:image:secure_url"]', "property", "og:image:secure_url", ARYA_OG_IMAGE);
    setMeta('meta[property="og:image:width"]', "property", "og:image:width", "1200");
    setMeta('meta[property="og:image:height"]', "property", "og:image:height", "630");
    setMeta('meta[property="og:image:type"]', "property", "og:image:type", "image/png");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", ARYA_OG_IMAGE);
    return () => {
      document.title = prev;
    };
  }, []);

  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = SHARE_URL;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Arya XO — Official Site",
          text: "Arya XO — 150 BANDS w/ HUGEL & NBA YoungBoy.",
          url: SHARE_URL,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    setShareOpen(true);
  };

  // ── Booking form ──────────────────────────────────────
  const [form, setForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_org: "",
    event_type: EVENT_TYPES[0],
    event_city: "",
    event_date: "",
    budget_usd: "",
    lineup: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit = useMemo(
    () => form.contact_name.trim() && /\S+@\S+\.\S+/.test(form.contact_email) && form.event_city.trim(),
    [form]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        artist_slug: ARTIST_SLUG,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_org: form.contact_org.trim() || null,
        event_type: form.event_type,
        event_city: form.event_city.trim(),
        event_date: form.event_date || null,
        budget_usd: form.budget_usd ? Math.max(0, Math.round(Number(form.budget_usd))) : null,
        lineup: form.lineup.trim() || null,
        message: form.message.trim() || null,
        source: "arya-xo-site",
      };
      const { error: insertErr } = await (supabase as any)
        .from("public_booking_inquiries")
        .insert(payload);
      if (insertErr) throw insertErr;
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Couldn't send. Try again or email booking@aryaxo.com.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="arya-site min-h-screen selection:bg-[#00FF85]/30">
      <AryaBandsAutoplay />
      {/* Sticky top bar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-black/60 border-b border-[var(--arya-border)]">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2 font-heading font-extrabold tracking-tight text-sm">
            ARYA <span className="text-[var(--arya-cta)]">XO</span>
          </a>
          <div className="hidden sm:flex items-center gap-6 text-xs">
            <a href="#music" className="arya-link">Music</a>
            <a href="#videos" className="arya-link">Videos</a>
            <a href="#about" className="arya-link">About</a>
            <a href="#tour" className="arya-link">Tour</a>
            <a href="#booking" className="arya-link">Booking</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="arya-btn arya-btn--primary arya-btn--sm"
              aria-label="Share this page"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <a href="/arya-xo" className="arya-btn arya-btn--ghost arya-btn--sm">
              Links
            </a>
          </div>
        </div>
      </nav>


      {/* Share modal */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0c] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Share Arya XO</h3>
              <button
                onClick={() => setShareOpen(false)}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--arya-text-mute)] mb-2">Public link</p>
            <div className="flex items-center gap-2 arya-card p-2">
              <input
                readOnly
                value={SHARE_URL}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-transparent text-sm px-2 py-2 outline-none truncate"
              />
              <button onClick={handleCopy} className="arya-btn arya-btn--primary arya-btn--sm">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent("Arya XO — 150 BANDS out now")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="arya-btn arya-btn--ghost arya-btn--sm"
              >
                X / Twitter
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="arya-btn arya-btn--ghost arya-btn--sm"
              >
                Facebook
              </a>
              <a
                href={`sms:?&body=${encodeURIComponent(`Arya XO — ${SHARE_URL}`)}`}
                className="arya-btn arya-btn--ghost arya-btn--sm"
              >
                Text
              </a>
            </div>

          </div>
        </div>
      )}

      {/* HERO */}
      <header id="top" className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center scale-110 blur-md opacity-60"
          style={{ backgroundImage: `url(${bg})` }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/80 to-[#050505]" />

        <div className="mx-auto max-w-6xl px-5 pt-16 pb-16 sm:pt-24 sm:pb-24 grid sm:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div>
            <div className="arya-chip">
              <Sparkles className="h-3 w-3" /> 150 BANDS — track 2 on HUGEL&apos;s album &lsquo;21&rsquo;
            </div>
            <h1 className="mt-5 font-heading font-extrabold tracking-tight leading-[0.92] text-[52px] sm:text-[112px]">
              ARYA <span className="text-[var(--arya-cta)]">XO</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[var(--arya-text-dim)] max-w-xl">
              22-year-old Iranian American rapper, singer & actor from Las Vegas.
              Dropped the track of the summer —{" "}
              <span className="text-[var(--arya-text)] font-semibold">HUGEL × NBA YoungBoy &mdash; &ldquo;150 BANDS&rdquo;</span>,
              the second cut on HUGEL&apos;s new album <span className="italic">21</span>.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a
                href="https://open.spotify.com/track/3QBkhZL0nUSrm6qcoSEZvt"
                target="_blank"
                rel="noopener noreferrer"
                className="arya-btn arya-btn--primary arya-btn--lg"
              >
                <Play className="h-4 w-4 fill-current" /> Spotify
              </a>
              <a
                href="https://music.apple.com/us/song/150-bands/6778877438"
                target="_blank"
                rel="noopener noreferrer"
                className="arya-btn arya-btn--ghost arya-btn--lg"
              >
                <Play className="h-4 w-4 fill-current" /> Apple Music
              </a>
              <a
                href="https://www.youtube.com/watch?v=gqYburgfJ9s"
                target="_blank"
                rel="noopener noreferrer"
                className="arya-btn arya-btn--ghost arya-btn--lg"
              >
                <Play className="h-4 w-4 fill-current" /> YouTube
              </a>
              <a href="#booking" className="arya-btn arya-btn--ghost arya-btn--lg">
                <Mail className="h-4 w-4" /> Book
              </a>
            </div>


          </div>

          <div className="relative mx-auto">
            <div className="absolute -inset-8 -z-10 rounded-full bg-[#00FF85]/25 blur-3xl" />
            <div className="h-64 w-64 sm:h-[22rem] sm:w-[22rem] rounded-[2rem] overflow-hidden ring-1 ring-white/15 shadow-[0_40px_120px_-30px_rgba(0,255,133,0.55)]">
              <img src={portrait} alt="Arya XO" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="border-y border-white/5 bg-black/40">
          <div className="overflow-hidden">
            <div className="flex gap-10 whitespace-nowrap py-3 animate-[marquee_30s_linear_infinite] font-heading text-sm uppercase tracking-[0.25em] text-white/40">
              {Array.from({ length: 2 }).flatMap((_, i) =>
                ["150 BANDS — OUT NOW", "ARYA XO × HUGEL × NBA YOUNGBOY", "NOW BOOKING 2026", "LAS VEGAS → WORLDWIDE"].map((t, j) => (
                  <span key={`${i}-${j}`} className="flex items-center gap-10">
                    {t}
                    <span className="text-[#00FF85]">✦</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </header>

      {/* MUSIC / RELEASES */}
      <section id="music" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#00FF85]">Discography</p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold">Latest releases</h2>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {RELEASES.map((r) => (
            <a
              key={r.title}
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="arya-card arya-card--interactive group relative overflow-hidden p-5"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-black/40 ring-1 ring-[var(--arya-border)] mb-4 relative">
                <img src={portrait} alt={r.title} className="h-full w-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="h-14 w-14 rounded-full bg-[var(--arya-cta)] text-[var(--arya-cta-fg)] flex items-center justify-center shadow-[var(--arya-glow)] group-hover:scale-110 transition">
                    <Play className="h-6 w-6 fill-current" />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--arya-cta)]">
                <Sparkles className="h-3 w-3" /> {r.tag} · {r.year}
              </div>
              <div className="mt-1 font-heading text-xl font-bold">{r.title}</div>
              <div className="text-xs text-[var(--arya-text-mute)]">{r.feat}</div>
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
              Arya XO is a 22-year-old Iranian American rapper, singer and actor,
              raised between Baltimore and Las Vegas in a family of musicians.
              He was on stage before most kids hit middle school and built a sound
              that bridges melodic R&B and pop-leaning club records.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">
              At 17 he was opening for Trippie Redd, Lil Yachty and Tory Lanez. At 22
              he dropped the track of the summer —{" "}
              <span className="text-[#00FF85] font-semibold">&ldquo;150 BANDS&rdquo;</span> with HUGEL &
              NBA YoungBoy — track 2 on HUGEL&apos;s new album <span className="italic">21</span>.
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
            <div key={s.k} className="arya-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-[var(--arya-text-mute)]">{s.k}</div>
              <div className="mt-1 font-heading text-base font-bold">{s.v}</div>
            </div>

          ))}
        </div>
      </section>

      {/* TOUR REQUESTS — fans vote for their city */}
      <TourRequestsSection />



      {/* BOOKING / EMBEDDED FORM */}
      <section
        id="booking"
        className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5"
      >
        <div className="arya-card arya-card--feature rounded-3xl p-6 sm:p-10">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12">
            {/* Left: pitch */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--arya-cta)]">Direct booking</p>
              <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold leading-tight">
                Book Arya XO in 60 seconds.
              </h2>
              <p className="mt-3 text-[var(--arya-text-dim)] max-w-md">
                Fill four fields, hit send. No agents, no back-and-forth — your inquiry
                lands directly in his team&apos;s inbox on UPLY and gets a same-week reply.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="arya-card p-4">
                  <MapPin className="h-4 w-4 text-[var(--arya-cta)]" />
                  <div className="mt-2 font-semibold text-sm">Touring from</div>
                  <div className="text-[var(--arya-text-mute)] text-xs">Las Vegas, NV — worldwide</div>
                </div>
                <div className="arya-card p-4">
                  <Calendar className="h-4 w-4 text-[var(--arya-cta)]" />
                  <div className="mt-2 font-semibold text-sm">Availability</div>
                  <div className="text-[var(--arya-text-mute)] text-xs">Now booking 2026</div>
                </div>
                <div className="arya-card p-4">
                  <DollarSign className="h-4 w-4 text-[var(--arya-cta)]" />
                  <div className="mt-2 font-semibold text-sm">Fee range</div>
                  <div className="text-[var(--arya-text-mute)] text-xs">Tiered — share your budget</div>
                </div>
                <div className="arya-card p-4">
                  <Users className="h-4 w-4 text-[var(--arya-cta)]" />
                  <div className="mt-2 font-semibold text-sm">Lineups welcome</div>
                  <div className="text-[var(--arya-text-mute)] text-xs">Festivals, clubs, brand events</div>
                </div>
              </div>

              <div className="mt-6 text-[11px] text-[var(--arya-text-faint)]">
                Prefer email? <a className="arya-link underline" href="mailto:booking@aryaxo.com">booking@aryaxo.com</a>
              </div>
            </div>

            {/* Right: form */}
            <div className="arya-card p-5 sm:p-6">

              {submitted ? (
                <div className="min-h-[420px] flex flex-col items-center justify-center text-center">
                  <div className="h-14 w-14 rounded-full bg-[var(--arya-cta)] text-[var(--arya-cta-fg)] flex items-center justify-center mb-4 shadow-[var(--arya-glow)]">
                    <Check className="h-7 w-7" strokeWidth={3} />
                  </div>
                  <h3 className="font-heading text-2xl font-bold">Inquiry sent.</h3>
                  <p className="mt-2 text-sm text-white/70 max-w-sm">
                    Your request is in front of Arya&apos;s team on UPLY. Expect a reply
                    within 3 business days — sooner for time-sensitive dates.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({
                        contact_name: "",
                        contact_email: "",
                        contact_org: "",
                        event_type: EVENT_TYPES[0],
                        event_city: "",
                        event_date: "",
                        budget_usd: "",
                        lineup: "",
                        message: "",
                      });
                    }}
                    className="mt-6 text-xs text-white/60 hover:text-white underline"
                  >
                    Submit another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Your name *">
                      <input
                        required
                        value={form.contact_name}
                        onChange={update("contact_name")}
                        placeholder="Jane Doe"
                        className={inputCx}
                      />
                    </Field>
                    <Field label="Email *">
                      <input
                        required
                        type="email"
                        value={form.contact_email}
                        onChange={update("contact_email")}
                        placeholder="you@venue.com"
                        className={inputCx}
                      />
                    </Field>
                  </div>

                  <Field label="Company / venue (optional)">
                    <input
                      value={form.contact_org}
                      onChange={update("contact_org")}
                      placeholder="Drai's Beach Club, Coachella, etc."
                      className={inputCx}
                    />
                  </Field>

                  <Field label="Event type">
                    <select value={form.event_type} onChange={update("event_type")} className={inputCx}>
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-[#0c0c0c]">{t}</option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Location (city, country) *">
                      <input
                        required
                        value={form.event_city}
                        onChange={update("event_city")}
                        placeholder="Las Vegas, USA"
                        className={inputCx}
                      />
                    </Field>
                    <Field label="Event date">
                      <input
                        type="date"
                        value={form.event_date}
                        onChange={update("event_date")}
                        className={inputCx}
                      />
                    </Field>
                  </div>

                  <Field label="Budget (USD)">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={form.budget_usd}
                      onChange={update("budget_usd")}
                      placeholder="25000"
                      className={inputCx}
                    />
                  </Field>

                  <Field label="Lineup / other artists on the bill">
                    <input
                      value={form.lineup}
                      onChange={update("lineup")}
                      placeholder="HUGEL, Roy Woods, +others"
                      className={inputCx}
                    />
                  </Field>

                  <Field label="Anything else (set length, hospitality, etc.)">
                    <textarea
                      rows={3}
                      value={form.message}
                      onChange={update("message")}
                      placeholder="60-min set, festival main stage, deposit terms…"
                      className={`${inputCx} resize-none`}
                    />
                  </Field>

                  {error && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="arya-btn arya-btn--primary arya-btn--lg w-full mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? "Sending…" : "Send booking inquiry"}
                  </button>

                  <p className="text-[10px] text-white/40 text-center pt-1">
                    Inquiries land inside UPLY. We never share your info.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Social row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            { Icon: Instagram, label: "Instagram", href: "https://www.instagram.com/litreeezy/" },
            { Icon: Youtube, label: "YouTube", href: "https://www.youtube.com/@litreeezy653" },
            { Icon: Music2, label: "Apple Music", href: "https://music.apple.com/us/artist/lit-reeezy/1597315016" },
            { Icon: Music2, label: "Spotify", href: "https://open.spotify.com/search/Arya%20XO" },
          ].map(({ Icon, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="arya-btn arya-btn--ghost arya-btn--sm"
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

const inputCx = "arya-input";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="arya-label">{label}</span>
      {children}
    </label>
  );
}


// ── Tour requests (anonymous voting) ─────────────────────
interface TourRequest {
  id: string;
  city: string;
  country: string;
  vote_count: number;
}

function getVoterFp(): string {
  try {
    const k = "uply_voter_fp";
    let v = localStorage.getItem(k);
    if (!v) {
      v = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return `anon-${Math.random().toString(36).slice(2)}`;
  }
}

function getVotedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem("uply_voted_tour_arya-xo") || "[]"));
  } catch {
    return new Set();
  }
}
function markVoted(id: string) {
  try {
    const s = getVotedSet();
    s.add(id);
    localStorage.setItem("uply_voted_tour_arya-xo", JSON.stringify(Array.from(s)));
  } catch {/* ignore */}
}

function TourRequestsSection() {
  const [items, setItems] = useState<TourRequest[]>([]);
  const [voted, setVoted] = useState<Set<string>>(() => getVotedSet());
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("public_tour_requests")
      .select("id, city, country, vote_count")
      .eq("artist_slug", ARTIST_SLUG)
      .order("vote_count", { ascending: false })
      .limit(50);
    setItems((data || []) as TourRequest[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("arya-tour-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "public_tour_requests" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const vote = async (id: string) => {
    if (voted.has(id)) return;
    // Optimistic
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, vote_count: i.vote_count + 1 } : i)));
    setVoted((prev) => new Set(prev).add(id));
    markVoted(id);
    const { error } = await (supabase as any).rpc("vote_public_tour_request", {
      _request_id: id,
      _voter_fp: getVoterFp(),
    });
    if (error) {
      setError(error.message);
      load();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim()) return;
    setSubmitting(true);
    setError(null);
    const { data, error } = await (supabase as any).rpc("create_public_tour_request", {
      _artist_slug: ARTIST_SLUG,
      _city: city.trim(),
      _country: country.trim(),
      _voter_fp: getVoterFp(),
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      markVoted(data as string);
      setVoted((prev) => new Set(prev).add(data as string));
    }
    setCity("");
    setCountry("");
    load();
  };

  const top = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <section id="tour" className="mx-auto max-w-6xl px-5 py-16 sm:py-20 border-t border-white/5">
      <div className="grid lg:grid-cols-[1.1fr_1.4fr] gap-10 items-start">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#00FF85]">Tour demand</p>
          <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold leading-tight">
            Pull up to your city.
          </h2>
          <p className="mt-3 text-white/75 max-w-md">
            Vote your city up the list. Promoters see real demand — and Arya routes
            tours to the cities with the loudest fans.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-2">
            <div className="grid grid-cols-[1.4fr_1fr] gap-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                required
                maxLength={80}
                className="arya-input"
              />
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                maxLength={80}
                className="arya-input"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !city.trim()}
              className="arya-btn arya-btn--primary w-full disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Request my city
            </button>

            {error && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
                {error}
              </div>
            )}
          </form>
        </div>

        <div>
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-white/50">
              Be the first to put your city on the map.
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                {top.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => vote(t.id)}
                    disabled={voted.has(t.id)}
                    className={`arya-card ${idx === 0 ? "arya-card--feature" : "arya-card--interactive"} text-left p-4 disabled:opacity-70 disabled:cursor-default`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--arya-text-mute)]">#{idx + 1}</div>
                      <div className={`text-[10px] uppercase tracking-wider font-bold ${idx === 0 ? "text-[var(--arya-cta)]" : "text-[var(--arya-text-faint)]"}`}>
                        {t.vote_count} {t.vote_count === 1 ? "vote" : "votes"}
                      </div>
                    </div>
                    <div className="mt-2 font-heading text-lg font-bold leading-tight">{t.city}</div>
                    {t.country && <div className="text-xs text-[var(--arya-text-mute)]">{t.country}</div>}
                    <div className={`mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold ${voted.has(t.id) ? "text-[var(--arya-text-faint)]" : "text-[var(--arya-cta)]"}`}>
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {voted.has(t.id) ? "Voted" : "Thumbs up"}
                    </div>
                  </button>
                ))}

              </div>

              {rest.length > 0 && (
                <ul className="rounded-2xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
                  {rest.map((t, idx) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-7 text-[11px] text-white/40">#{idx + 4}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {t.city}{t.country ? `, ${t.country}` : ""}
                        </div>
                      </div>
                      <span className="text-[11px] text-white/50 tabular-nums">{t.vote_count}</span>
                      <button
                        onClick={() => vote(t.id)}
                        disabled={voted.has(t.id)}
                        aria-label={voted.has(t.id) ? "Voted" : "Thumbs up"}
                        className={
                          voted.has(t.id)
                            ? "arya-btn arya-btn--ghost arya-btn--sm opacity-60 inline-flex items-center gap-1.5"
                            : "arya-btn arya-btn--primary arya-btn--sm inline-flex items-center gap-1.5"
                        }
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {voted.has(t.id) ? "Voted" : "Vote"}
                      </button>

                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

