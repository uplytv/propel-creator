import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import TrialSignupModal from "@/components/pricing/TrialSignupModal";

const NAV_LINKS = [
  { label: "Discover", href: "/discover" },
  { label: "Artist sites", href: "/roster" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Compare", href: "/#comparison" },
  { label: "Blog", href: "/blog" },
];

export default function HomepageNav() {
  const [scrolled, setScrolled] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
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
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="text-[13px] font-semibold tracking-wide text-foreground/80 hover:text-gold transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <details className="relative md:hidden">
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-md px-3 text-[13px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-11 z-50 w-48 rounded-md border border-border bg-background p-2 shadow-lg"
            >
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.label}
                  to={l.href}
                  className="block rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/auth" className="block rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                Sign in
              </Link>
            </nav>
          </details>
          <Link
            to="/auth"
            className="hidden md:inline-flex items-center text-[13px] font-semibold text-foreground hover:text-gold transition-colors px-3 py-2 rounded-md"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => setTrialOpen(true)}
            className="btn-primary-glow inline-flex items-center rounded-md px-4 sm:px-5 h-9 sm:h-10 text-[13px] font-bold tracking-wide"
          >
            Start free trial
          </button>
        </div>
      </div>
      <TrialSignupModal open={trialOpen} onOpenChange={setTrialOpen} defaultPlan="starter" />
    </header>
  );
}
