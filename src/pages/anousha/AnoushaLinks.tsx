import { Link } from "react-router-dom";
import { ArrowUpRight, Instagram } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AnoushaShell, Display, Reveal, gold, ink, sans, serif } from "./shell";
import { BRAND, IMAGES, LINKS } from "./content";

export default function AnoushaLinks() {
  return (
    <AnoushaShell>
      <SEOHead
        title="Anousha Nikjouian — Links"
        description="Work with Anousha, join The Defined Circle, take The Blueprint, get a free home valuation, or read the DMV market journal."
        image={IMAGES.portrait}
      />
      <div className="max-w-[560px] mx-auto px-5 pt-12 pb-20">
        <Reveal>
          <div className="text-center">
            {/* Portrait slot — swap for her IG headshot */}
            <div className="relative mx-auto h-[132px] w-[132px] overflow-hidden rounded-full">
              <img src={IMAGES.portrait} alt={BRAND.name} className="h-full w-full object-cover" />
            </div>
            <Display className="text-[30px] mt-6" as="h1">{BRAND.name}</Display>
            <p className="mt-2 text-[11px] tracking-[0.28em] uppercase" style={{ ...sans, color: gold }}>
              {BRAND.wordmark} · {BRAND.markets}
            </p>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ ...sans, color: "#4A423A" }}>
              REALTOR® at Compass. DMV native, investor, and educator — helping first-time buyers and portfolio
              builders across DC, Maryland and Virginia.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col gap-3">
          {LINKS.map((l, i) => {
            const inner = (
              <span className="flex items-center justify-between gap-4 w-full">
                <span className="min-w-0 text-left">
                  <span className="block text-[17px]" style={{ ...serif, color: l.primary ? "#FBF7F1" : ink }}>{l.label}</span>
                  <span className="block text-[12px] mt-0.5 truncate" style={{ ...sans, color: l.primary ? "rgba(251,247,241,.7)" : "#8A8078" }}>{l.sub}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: l.primary ? "#E6D2AE" : gold }} />
              </span>
            );
            const cls = `flex items-center min-h-[76px] px-6 border transition-all duration-300 hover:-translate-y-[2px] ${
              l.primary ? "bg-[#14110E] border-[#14110E] hover:bg-[#2B241C]" : "border-[#14110E]/14 hover:border-[#B08D57]"
            }`;
            return (
              <Reveal key={l.label} delay={i * 60}>
                {l.href ? (
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className={cls} style={l.primary ? undefined : { background: "#FFFDFA" }}>
                    {inner}
                  </a>
                ) : (
                  <Link to={l.to!} className={cls} style={l.primary ? undefined : { background: "#FFFDFA" }}>
                    {inner}
                  </Link>
                )}
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120}>
          <a
            href={BRAND.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 flex items-center justify-center gap-2 text-[12px] tracking-[0.16em] uppercase hover:opacity-60 transition"
            style={{ ...sans, color: ink }}
          >
            <Instagram className="h-4 w-4" /> {BRAND.instagramHandle}
          </a>
          <p className="mt-6 text-center text-[10px] leading-relaxed" style={{ ...sans, color: "#8A8078" }}>
            {BRAND.disclosure}
          </p>
        </Reveal>
      </div>
    </AnoushaShell>
  );
}
