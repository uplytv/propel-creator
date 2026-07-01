import { useEffect } from "react";
import {
  Instagram,
  TrendingUp,
  Trophy,
  Newspaper,
  GraduationCap,
  Mail,
  Twitter,
} from "lucide-react";
import { Link } from "react-router-dom";
import portraitAsset from "@/assets/blake-portrait.jpg.asset.json";
import lifestyleAsset from "@/assets/blake-lifestyle.jpg";
import tradingAsset from "@/assets/blake-trading-desk.jpg";
import betAsset from "@/assets/blake-bet-win.jpg";
import portfolioAsset from "@/assets/blake-portfolio.jpg";
import BackButton from "@/components/common/BackButton";

/**
 * Blake The Great — public creator showcase.
 * Route: /blake  (also /blake-the-great, /blakethegreat)
 */

const LINKS = [
  {
    label: "Join The Blueprint — $97 / month",
    sub: "Live trades + sports bets, daily",
    href: "/blake-the-great/course",
    icon: GraduationCap,
    accent: "bg-gradient-to-br from-[#00FF85] to-[#00B85F]",
    featured: true,
  },
  {
    label: "Read: $70K → $500K in 40 days",
    sub: "The story behind the run",
    href: "/blake-the-great/blog",
    icon: Newspaper,
    accent: "bg-gradient-to-br from-[#3D7CFF] to-[#B025FF]",
  },
  {
    label: "Instagram",
    sub: "@blakethegreat1312",
    href: "https://www.instagram.com/blakethegreat1312",
    icon: Instagram,
    accent: "bg-gradient-to-br from-[#FEDA75] via-[#FA7E1E] to-[#D62976]",
  },
  {
    label: "X / Twitter",
    sub: "Trade & bet alerts",
    href: "https://x.com/search?q=blakethegreat1312",
    icon: Twitter,
    accent: "bg-black border border-white/20",
  },
  {
    label: "Email Blake",
    sub: "blake@blakethegreat.com",
    href: "mailto:blake@blakethegreat.com",
    icon: Mail,
    accent: "bg-white/10",
  },
];

export default function BlakeTheGreat() {
  useEffect(() => {
    document.title = "Blake The Great — Trader, Sports Bettor, California";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Blake turned $70K into $500K in under 40 days. Follow his live trades and sports bets, or join The Blueprint for $97/mo.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      <BackButton />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(rgba(10,10,10,0.55), rgba(10,10,10,0.95)), url(${lifestyleAsset})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
          <img
            src={portraitAsset.url}
            alt="Blake"
            className="mx-auto h-32 w-32 rounded-full object-cover ring-2 ring-[#00FF85]/60 ring-offset-4 ring-offset-[#0A0A0A] mb-5"
          />
          <p className="text-xs uppercase tracking-[0.25em] text-[#00FF85] mb-2">
            California · Verified Trader
          </p>
          <h1 className="font-display font-bold text-4xl md:text-6xl tracking-tight">
            Blake <span className="text-[#00FF85]">The Great</span>
          </h1>
          <p className="mt-4 text-white/70 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            Stocks. Sports bets. Real money on the line. Turned{" "}
            <span className="text-white font-semibold">$70,000</span> into{" "}
            <span className="text-[#00FF85] font-semibold">$500,000</span> in
            under <span className="text-white font-semibold">40 days</span>.
          </p>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#00FF85]" />
              <span className="text-white/80">614% run</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#00FF85]" />
              <span className="text-white/80">38-day streak</span>
            </div>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="max-w-3xl mx-auto px-6 -mt-2">
        <div className="grid grid-cols-3 gap-2">
          {[portfolioAsset, betAsset, tradingAsset].map((src, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-white/5"
            >
              <img
                src={src}
                alt="Trading proof"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-white/40 mt-2">
          Real screens from the run.
        </p>
      </section>

      {/* Links */}
      <section className="max-w-2xl mx-auto px-6 mt-10 space-y-3">
        {LINKS.map((l) => {
          const Icon = l.icon;
          const isInternal = l.href.startsWith("/");
          const inner = (
            <div
              className={`flex items-center gap-4 rounded-2xl p-4 border transition-all ${
                l.featured
                  ? "border-[#00FF85]/40 bg-[#00FF85]/[0.06] hover:bg-[#00FF85]/[0.1]"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${l.accent}`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] truncate">
                  {l.label}
                </div>
                {l.sub && (
                  <div className="text-xs text-white/60 truncate">{l.sub}</div>
                )}
              </div>
            </div>
          );
          return isInternal ? (
            <Link key={l.label} to={l.href}>
              {inner}
            </Link>
          ) : (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
              {inner}
            </a>
          );
        })}
      </section>

      <footer className="max-w-2xl mx-auto px-6 mt-12 text-center">
        <Link
          to="/"
          className="text-xs text-white/40 hover:text-white/70 transition"
        >
          Powered by UPLY
        </Link>
      </footer>
    </main>
  );
}
