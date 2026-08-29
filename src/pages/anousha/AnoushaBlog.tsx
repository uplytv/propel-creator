import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { AnoushaShell, Display, Eyebrow, LeadForm, Reveal, gold, ink, sans } from "./shell";
import { IMAGES, POSTS } from "./content";

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function AnoushaBlog() {
  const [lead, ...rest] = POSTS;

  return (
    <AnoushaShell>
      <SEOHead
        title="The Journal — DMV Real Estate Notes by Anousha Nikjouian"
        description="Essays on buying, investing, renovating and renting in Washington DC, Maryland and Virginia — from a REALTOR® who owns what she advises."
        image={IMAGES.hero}
      />
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 pt-14 pb-8">
        <Reveal>
          <Eyebrow>The Journal</Eyebrow>
          <Display className="text-[38px] sm:text-[58px] max-w-3xl" as="h1">
            Notes on the DMV market, written for people about to make a decision.
          </Display>
        </Reveal>
      </div>

      {/* lead story */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 pb-16">
        <Reveal>
          <Link to={`/anousha/blog/${lead.slug}`} className="group grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="aspect-[4/3] overflow-hidden order-1 md:order-none">
              <img src={lead.image} alt={lead.title} className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-105" />
            </div>
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase" style={{ ...sans, color: gold }}>
                {lead.tag} · {lead.readTime}
              </p>
              <Display className="text-[30px] sm:text-[40px] mt-3 group-hover:opacity-70 transition-opacity">{lead.title}</Display>
              <p className="mt-4 text-[16px] leading-relaxed" style={{ ...sans, color: "#4A423A" }}>{lead.dek}</p>
              <p className="mt-5 text-[12px]" style={{ ...sans, color: "#8A8078" }}>{fmt(lead.date)}</p>
            </div>
          </Link>
        </Reveal>
      </section>

      {/* grid */}
      <section className="border-t border-[#14110E]/10" style={{ background: "#F3EDE4" }}>
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-20 grid gap-10 md:grid-cols-3">
          {rest.map((p, i) => (
            <Reveal key={p.slug} delay={i * 100}>
              <Link to={`/anousha/blog/${p.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                </div>
                <p className="mt-5 text-[11px] tracking-[0.2em] uppercase" style={{ ...sans, color: gold }}>{p.tag} · {p.readTime}</p>
                <Display className="text-[23px] mt-2 group-hover:opacity-70 transition-opacity">{p.title}</Display>
                <p className="mt-3 text-[14px] leading-relaxed" style={{ ...sans, color: "#4A423A" }}>{p.dek}</p>
                <p className="mt-4 text-[12px]" style={{ ...sans, color: "#8A8078" }}>{fmt(p.date)}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-[860px] mx-auto px-5 sm:px-8 py-24">
        <Reveal>
          <LeadForm
            source="anousha-blog"
            heading="Thinking about your next move?"
            sub="Send me where you are and I'll come back with the honest version — even when that's 'wait six months'."
          />
        </Reveal>
      </section>
      <span className="hidden" style={{ color: ink }} />
    </AnoushaShell>
  );
}
