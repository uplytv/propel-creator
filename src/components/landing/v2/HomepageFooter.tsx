import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { COMPARISONS } from "@/data/comparisons";

export default function HomepageFooter() {
  return (
    <footer className="border-t border-border/40 bg-background py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
            <img src={logo} alt="UPLY" className="h-7 w-7 rounded-md" />
            <span className="font-display text-lg font-bold tracking-tight text-foreground">UPLY</span>
          </div>
          <div className="text-sm text-primary font-semibold">Get up. Get UPLY.</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/pricing" className="text-foreground/70 hover:text-foreground">Pricing</Link>
          <Link to="/privacy" className="text-foreground/70 hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="text-foreground/70 hover:text-foreground">Terms</Link>
          <Link to="/auth" className="text-foreground/70 hover:text-foreground">Sign In</Link>
        </div>

        <div className="text-xs text-foreground/50">© {new Date().getFullYear()} UPLY</div>
      </div>

      {/* UPLY vs — comparison pages */}
      <div className="max-w-7xl mx-auto mt-10 pt-8 border-t border-border/40">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-foreground/50 mb-3 text-center md:text-left">
          UPLY vs
        </div>
        <nav
          aria-label="Comparison pages"
          className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-sm"
        >
          {COMPARISONS.map((c) => (
            <Link
              key={c.slug}
              to={`/vs/${c.slug}`}
              className="text-foreground/70 hover:text-foreground"
            >
              UPLY vs {c.competitorName}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
