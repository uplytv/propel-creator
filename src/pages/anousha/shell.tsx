/**
 * Shared chrome + primitives for Anousha Nikjouian's brand site.
 * Luxury editorial system: ivory ground, near-black ink, champagne gold accent,
 * Playfair Display for display type, Inter for body.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Instagram, Menu, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ANOUSHA_BUSINESS_ID, BRAND } from "./content";

export const ink = "#14110E";
export const gold = "#B08D57";
export const serif = { fontFamily: "'Playfair Display', 'Cormorant Garamond', Georgia, serif" };
export const sans = { fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif" };

const NAV = [
  { label: "Home", to: "/anousha" },
  { label: "Defined Circle", to: "/anousha/circle" },
  { label: "The Blueprint", to: "/anousha/blueprint" },
  { label: "Journal", to: "/anousha/blog" },
  { label: "Links", to: "/anousha/links" },
];

/* ---------------------------------------------------------------- primitives */

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setShown(true), io.disconnect()),
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: `opacity .9s cubic-bezier(.22,.8,.28,1) ${delay}ms, transform .9s cubic-bezier(.22,.8,.28,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] tracking-[0.28em] uppercase mb-4" style={{ ...sans, color: gold }}>
      {children}
    </p>
  );
}

export function Display({ children, className = "", as: As = "h2" }: { children: ReactNode; className?: string; as?: any }) {
  return (
    <As className={`font-normal leading-[1.08] tracking-[-0.01em] ${className}`} style={{ ...serif, color: ink }}>
      {children}
    </As>
  );
}

export function GoldRule() {
  return <span className="block w-12 h-px" style={{ background: gold }} />;
}

export function CTA({
  children,
  to,
  href,
  onClick,
  variant = "solid",
  className = "",
}: {
  children: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "outline" | "gold";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center min-h-[52px] px-7 text-[13px] tracking-[0.16em] uppercase transition-all duration-300";
  const styles: Record<string, string> = {
    solid: "bg-[#14110E] text-[#FBF7F1] hover:bg-[#2B241C]",
    outline: "border border-[#14110E]/25 text-[#14110E] hover:border-[#14110E] hover:bg-[#14110E] hover:text-[#FBF7F1]",
    gold: "bg-[#B08D57] text-[#14110E] hover:bg-[#9C7A47] hover:text-[#FBF7F1]",
  };
  const cls = `${base} ${styles[variant]} ${className}`;
  if (to) return <Link to={to} className={cls} style={sans}>{children}</Link>;
  if (href) {
    const external = !href.startsWith("#");
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={cls}
        style={sans}
      >
        {children}
      </a>
    );
  }
  return <button type="button" onClick={onClick} className={cls} style={sans}>{children}</button>;
}

/* ------------------------------------------------------------------- header */

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className="sticky top-0 z-40 transition-colors duration-300"
      style={{
        background: solid ? "rgba(251,247,241,0.92)" : "transparent",
        backdropFilter: solid ? "blur(10px)" : undefined,
        borderBottom: solid ? "1px solid rgba(20,17,14,0.08)" : "1px solid transparent",
      }}
    >
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between">
        <Link to="/anousha" className="leading-none">
          <span className="block text-[17px]" style={{ ...serif, color: ink }}>Anousha Nikjouian</span>
          <span className="block text-[9px] tracking-[0.3em] uppercase mt-1" style={{ ...sans, color: gold }}>
            {BRAND.wordmark}
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {NAV.slice(1).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-[12px] tracking-[0.14em] uppercase transition-opacity hover:opacity-60"
              style={{ ...sans, color: ink }}
            >
              {n.label}
            </Link>
          ))}
          <CTA to="/anousha#work" variant="solid" className="!min-h-[44px] !px-5">Work with me</CTA>
        </nav>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
          className="md:hidden h-11 w-11 -mr-2 inline-flex items-center justify-center"
          style={{ color: ink }}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-[#14110E]/10" style={{ background: "#FBF7F1" }}>
          <div className="px-5 py-3 flex flex-col">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="py-4 text-[13px] tracking-[0.14em] uppercase border-b border-[#14110E]/8 last:border-0"
                style={{ ...sans, color: ink }}
              >
                {n.label}
              </Link>
            ))}
            <CTA to="/anousha#work" className="mt-4 mb-2 w-full">Work with me</CTA>
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------- footer */

function Footer() {
  return (
    <footer className="border-t border-[#14110E]/10 mt-24" style={{ background: "#F3EDE4" }}>
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-14 grid gap-10 md:grid-cols-3">
        <div>
          <Display className="text-2xl">{BRAND.name}</Display>
          <p className="mt-2 text-sm" style={{ ...sans, color: "#6B625A" }}>{BRAND.role}</p>
          <a
            href={BRAND.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm hover:opacity-70 transition"
            style={{ ...sans, color: ink }}
          >
            <Instagram className="h-4 w-4" /> {BRAND.instagramHandle}
          </a>
        </div>
        <div className="flex flex-col gap-3">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm hover:opacity-60 transition" style={{ ...sans, color: ink }}>
              {n.label}
            </Link>
          ))}
        </div>
        <div>
          <p className="text-[11px] leading-relaxed" style={{ ...sans, color: "#6B625A" }}>{BRAND.disclosure}</p>
          <p className="text-[11px] mt-4" style={{ ...sans, color: "#8A8078" }}>
            Powered by <Link to="/" className="underline">UPLY</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------- lead capture */

export type LeadIntent = "buy" | "sell" | "invest" | "other";

export function LeadForm({
  source,
  compact = false,
  defaultIntent = "buy",
  heading = "Let's talk about your next move",
  sub = "Tell me where you are and I'll come back with a real plan — not a drip campaign.",
}: {
  source: string;
  compact?: boolean;
  defaultIntent?: LeadIntent;
  heading?: string;
  sub?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState<LeadIntent>(defaultIntent);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("business_leads").insert({
      business_id: ANOUSHA_BUSINESS_ID,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      message: `[${intent.toUpperCase()}] ${message.trim()}`.trim(),
      source,
    } as never);
    setBusy(false);
    if (error) {
      toast.error("Something went wrong — please try again.");
      return;
    }
    setDone(true);
  }

  const field =
    "w-full h-[52px] px-4 text-[16px] bg-transparent border border-[#14110E]/20 focus:border-[#B08D57] outline-none transition-colors";

  if (done) {
    return (
      <div className="text-center py-12 px-6 border border-[#B08D57]/40" style={{ background: "#FFFDFA" }}>
        <Check className="h-7 w-7 mx-auto mb-4" style={{ color: gold }} />
        <Display className="text-2xl">Thank you — I'll be in touch.</Display>
        <p className="mt-3 text-sm" style={{ ...sans, color: "#6B625A" }}>
          You'll hear from me personally, usually within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "px-6 sm:px-10 py-10 border border-[#14110E]/12"} style={compact ? undefined : { background: "#FFFDFA" }}>
      {!compact && (
        <>
          <Display className="text-3xl sm:text-4xl">{heading}</Display>
          <p className="mt-3 mb-8 text-[15px] max-w-xl" style={{ ...sans, color: "#6B625A" }}>{sub}</p>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} style={sans} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={field} style={sans} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} style={sans} type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <select className={field} style={sans} value={intent} onChange={(e) => setIntent(e.target.value as LeadIntent)}>
          <option value="buy">I'm looking to buy</option>
          <option value="sell">I'm thinking of selling</option>
          <option value="invest">I want to invest</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <textarea
        className={`${field} h-auto min-h-[110px] py-3 mt-3`}
        style={sans}
        placeholder="Where are you in the process? (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full min-h-[54px] bg-[#14110E] text-[#FBF7F1] text-[13px] tracking-[0.16em] uppercase hover:bg-[#2B241C] transition disabled:opacity-60"
        style={sans}
      >
        {busy ? "Sending…" : "Send it over"}
      </button>
      <p className="mt-3 text-[11px]" style={{ ...sans, color: "#8A8078" }}>
        No spam, no drip funnel. Equal Housing Opportunity.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------- page wrapper */

export function AnoushaShell({ children, sticky }: { children: ReactNode; sticky?: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#FBF7F1", color: ink, ...sans }}>
      <Header />
      {children}
      <Footer />
      {sticky && (
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3 border-t border-[#14110E]/10"
          style={{ background: "rgba(251,247,241,0.96)", backdropFilter: "blur(10px)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          {sticky}
        </div>
      )}
    </div>
  );
}
