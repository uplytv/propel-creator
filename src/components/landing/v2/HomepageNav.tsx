import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const NAV_LINKS = [
  { label: "Creators", href: "#streamers" },
  { label: "Roster", href: "/roster", internal: true },
  { label: "Pricing", href: "#pricing" },
  { label: "Blog", href: "/blog", internal: true },
];

export default function HomepageNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-gold-hairline"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
        <Link to="/" className="flex items-center" aria-label="Uply home">
          <img src={logo} alt="Uply" className="h-12 sm:h-14 md:h-16 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          {NAV_LINKS.map((l) =>
            l.internal ? (
              <Link
                key={l.label}
                to={l.href}
                className="text-[13px] font-semibold tracking-wide text-foreground/70 hover:text-gold transition-colors"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="text-[13px] font-semibold tracking-wide text-foreground/70 hover:text-gold transition-colors"
              >
                {l.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/auth"
            className="hidden sm:inline-flex items-center text-[13px] font-semibold text-foreground/80 hover:text-gold transition-colors px-3 py-2 rounded-md"
          >
            Sign In
          </Link>
          <Link
            to="/auth"
            className="btn-primary-glow inline-flex items-center rounded-full px-4 sm:px-5 h-9 sm:h-10 text-[13px] font-bold tracking-wide"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
