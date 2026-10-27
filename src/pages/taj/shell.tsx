import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { ASSETS, BRAND, MEMBERSHIP, SOCIALS } from "./content";

export const gold = "#E4C98A";
export const goldDeep = "#C6A15A";
export const ink = "#07080C";
export const paper = "#F4EFE6";
export const cinzel = { fontFamily: "'Cinzel', 'Times New Roman', serif" };
export const inter = { fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif" };

const NAV = [
  { label: "Club", to: "/taj" },
  { label: "Classroom", to: "/taj/classroom" },
  { label: "Join", to: "/taj/join" },
];

function useTajFonts() {
  useEffect(() => {
    const id = "taj-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

export function TajShell({
  children,
  overHero = false,
}: {
  children: ReactNode;
  overHero?: boolean;
}) {
  useTajFonts();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !overHero || scrolled || open;

  return (
    <div className="min-h-screen" style={{ background: ink, color: paper, ...inter }}>
      <header
        className="fixed top-0 inset-x-0 z-50 transition-colors duration-300"
        style={{
          background: solid ? "rgba(7,8,12,0.92)" : "transparent",
          backdropFilter: solid ? "blur(16px)" : undefined,
          borderBottom: solid ? "1px solid rgba(228,201,138,0.18)" : "1px solid transparent",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[72px] flex items-center gap-4">
          <Link to="/taj" className="flex items-center gap-3 min-w-0">
            <img src={ASSETS.mark} alt="" className="h-10 w-10 object-contain" />
            <span className="leading-tight min-w-0">
              <span className="block text-[15px] tracking-[0.22em]" style={cinzel}>
                TAJ
              </span>
              <span className="block text-[10px] tracking-[0.18em] uppercase opacity-70">Fencing Club</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 ml-8">
            {NAV.map((item) => {
              const active = item.to === "/taj" ? pathname === "/taj" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-[12px] tracking-[0.2em] uppercase"
                  style={{ color: active ? gold : "rgba(244,239,230,0.78)" }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto hidden md:block">
            <Link
              to="/taj/join#membership"
              className="inline-flex items-center h-11 px-5 text-[12px] tracking-[0.16em] uppercase"
              style={{ background: gold, color: "#1A140C", ...inter, fontWeight: 600 }}
            >
              Join Taj Club
            </Link>
          </div>
          <button
            type="button"
            className="md:hidden ml-auto h-11 w-11 inline-flex items-center justify-center"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden px-4 pb-4 grid gap-1" style={{ background: "rgba(7,8,12,0.96)" }}>
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className="py-3 text-[13px] tracking-[0.18em] uppercase border-b border-white/10">
                {item.label}
              </Link>
            ))}
            <Link
              to="/taj/join#membership"
              className="mt-3 h-12 inline-flex items-center justify-center text-[12px] tracking-[0.16em] uppercase font-semibold"
              style={{ background: gold, color: "#1A140C" }}
            >
              Join Taj Club · {MEMBERSHIP.priceLabel}
            </Link>
          </div>
        )}
      </header>

      <main className={overHero ? "" : "pt-[72px]"}>{children}</main>

      <footer className="border-t border-[#E4C98A]/25 mt-8">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <img src={ASSETS.logo} alt="TAJ Fencing Club" className="h-28 w-auto object-contain" />
            <p className="mt-4 text-[13px] tracking-[0.22em] uppercase" style={{ color: gold }}>
              {BRAND.tagline}
            </p>
          </div>
          <div className="text-[14px] leading-relaxed text-white/80">
            <p>{BRAND.address}</p>
            <p className="mt-2">
              <a href={BRAND.phoneHref} className="hover:text-[#E4C98A]">{BRAND.phone}</a>
            </p>
            <p className="mt-1">
              <a href={BRAND.emailHref} className="hover:text-[#E4C98A]">{BRAND.email}</a>
            </p>
            <p className="mt-3 text-[13px] text-white/60">
              Mon–Fri 3:00–9:30 PM
              <br />
              Sat 9:00 AM–2:00 PM
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 content-start text-[13px]">
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="hover:text-[#E4C98A]">
                {s.label}
              </a>
            ))}
            <a href={BRAND.site} target="_blank" rel="noreferrer" className="hover:text-[#E4C98A]">
              tajfencing.com
            </a>
          </div>
        </div>
        <p className="text-center text-[11px] tracking-[0.14em] uppercase text-white/45 pb-24 md:pb-8">
          © 2026 TAJ Fencing Club — Precision. Honor. Excellence. · On UPLY
        </p>
      </footer>

      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3 border-t border-[#E4C98A]/30 flex items-center gap-3"
        style={{ background: "rgba(7,8,12,0.94)", backdropFilter: "blur(12px)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-[0.16em] uppercase text-white/60">Club membership</p>
          <p className="text-[15px] font-semibold" style={{ color: gold }}>{MEMBERSHIP.priceLabel}</p>
        </div>
        <Link
          to="/taj/join#membership"
          className="h-11 px-4 inline-flex items-center text-[12px] tracking-[0.14em] uppercase font-semibold shrink-0"
          style={{ background: gold, color: "#1A140C" }}
        >
          Join Taj Club
        </Link>
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] tracking-[0.32em] uppercase mb-3" style={{ color: gold, ...inter }}>
      {children}
    </p>
  );
}

export function Display({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`leading-[1.05] ${className}`} style={{ ...cinzel, color: paper }}>
      {children}
    </h2>
  );
}
