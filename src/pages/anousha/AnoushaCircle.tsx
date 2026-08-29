import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AnoushaShell, CTA, Display, Eyebrow, LeadForm, Reveal, gold, ink, sans, serif } from "./shell";
import { CIRCLE_FAQ, IMAGES, TIERS } from "./content";

export default function AnoushaCircle() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <AnoushaShell sticky={<CTA href="#tiers" className="w-full">Join Defined Circle</CTA>}>
      <SEOHead
        title="The Defined Circle — Anousha Nikjouian"
        description="A members-only community for people who want real estate in their future — first-time buyers, first-time investors, and portfolio builders across DC, Maryland and Virginia. Tiers from $19/mo."
        image={IMAGES.hero}
      />

      {/* hero */}
      <section className="relative -mt-[72px]">
        <div className="relative min-h-[74vh] flex items-end overflow-hidden">
          <img src={IMAGES.about} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,17,14,.6) 0%, rgba(20,17,14,.45) 40%, rgba(20,17,14,.85) 100%)" }} />
          <div className="relative max-w-[1240px] mx-auto px-5 sm:px-8 pb-20 pt-32">
            <Reveal>
              <p className="text-[11px] tracking-[0.32em] uppercase mb-5" style={{ ...sans, color: "#E6D2AE" }}>The Defined Circle</p>
              <h1 className="text-[11vw] sm:text-[68px] leading-[0.98]" style={{ ...serif, color: "#FBF7F1" }}>
                The room where DMV
                <br />wealth gets built.
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed" style={{ ...sans, color: "rgba(251,247,241,.82)" }}>
                A members-only community for people who want real estate in their future — first-time buyers,
                first-time investors, and portfolio builders across DC, Maryland, and Virginia.
              </p>
              <div className="mt-8"><CTA href="#tiers" variant="gold">See the tiers</CTA></div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* what's inside */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24">
        <Reveal>
          <Eyebrow>What's inside</Eyebrow>
          <Display className="text-[34px] sm:text-[46px] max-w-2xl">
            Not another feed. A working room with your numbers on the table.
          </Display>
        </Reveal>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {[
            { t: "The weekly market drop", c: "What actually moved in DC, Montgomery, PG, Arlington and Fairfax — inventory, days on market, and what it means for your specific plan." },
            { t: "Deals pulled apart live", c: "Bring a listing. We underwrite it together, line by line, until you can see the walk-away number without me." },
            { t: "People one step ahead", c: "Half the room closed their first property this year. The other half is about to. That proximity is the whole product." },
          ].map((b, i) => (
            <Reveal key={b.t} delay={i * 100}>
              <div className="border-t border-[#B08D57]/50 pt-6">
                <Display className="text-[24px]">{b.t}</Display>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ ...sans, color: "#4A423A" }}>{b.c}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* tiers */}
      <section id="tiers" className="border-y border-[#14110E]/10 scroll-mt-20" style={{ background: "#F3EDE4" }}>
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24">
          <Reveal>
            <Eyebrow>Membership</Eyebrow>
            <Display className="text-[34px] sm:text-[46px]">Three ways in.</Display>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3 items-start">
            {TIERS.map((t, i) => (
              <Reveal key={t.id} delay={i * 100}>
                <div
                  className={`relative h-full flex flex-col p-8 border transition-colors duration-500 ${
                    t.featured ? "border-[#B08D57] md:-mt-6 md:pb-12" : "border-[#14110E]/12 hover:border-[#B08D57]/60"
                  }`}
                  style={{ background: t.featured ? "#14110E" : "#FFFDFA" }}
                >
                  {t.featured && (
                    <span className="absolute -top-3 left-8 px-3 py-1 text-[10px] tracking-[0.2em] uppercase" style={{ ...sans, background: gold, color: "#14110E" }}>
                      Most popular
                    </span>
                  )}
                  {t.cap && (
                    <span className="absolute -top-3 left-8 px-3 py-1 text-[10px] tracking-[0.2em] uppercase border" style={{ ...sans, borderColor: gold, background: "#FFFDFA", color: gold }}>
                      Only {t.cap} seats
                    </span>
                  )}
                  <p className="text-[11px] tracking-[0.24em] uppercase" style={{ ...sans, color: t.featured ? "#E6D2AE" : "#8A8078" }}>
                    {t.name}
                  </p>
                  <p className="mt-4 flex items-baseline gap-1" style={{ ...serif, color: t.featured ? "#FBF7F1" : ink }}>
                    <span className="text-[46px] leading-none">${t.price}</span>
                    <span className="text-[13px]" style={{ ...sans, color: t.featured ? "rgba(251,247,241,.6)" : "#8A8078" }}>/mo</span>
                  </p>
                  <p className="mt-4 text-[15px] leading-relaxed" style={{ ...sans, color: t.featured ? "rgba(251,247,241,.78)" : "#4A423A" }}>
                    {t.promise}
                  </p>
                  <ul className="mt-6 space-y-3 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-3 text-[14px]" style={{ ...sans, color: t.featured ? "rgba(251,247,241,.9)" : "#4A423A" }}>
                        <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: gold }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <CTA
                    href="#join"
                    variant={t.featured ? "gold" : "outline"}
                    className="mt-8 w-full"
                  >
                    Join {t.name}
                  </CTA>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center text-[12px]" style={{ ...sans, color: "#8A8078" }}>
            Cancel any time. Inner Keys is capped at 25 members — cancelled seats open to the waitlist.
          </p>
        </div>
      </section>

      {/* faq */}
      <section className="max-w-[820px] mx-auto px-5 sm:px-8 py-24">
        <Reveal>
          <Eyebrow>Questions</Eyebrow>
          <Display className="text-[34px] sm:text-[42px]">Before you join.</Display>
        </Reveal>
        <div className="mt-10 border-t border-[#14110E]/12">
          {CIRCLE_FAQ.map((f, i) => (
            <div key={f.q} className="border-b border-[#14110E]/12">
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-6 py-6 text-left"
              >
                <span className="text-[19px]" style={{ ...serif, color: ink }}>{f.q}</span>
                {open === i ? <Minus className="h-4 w-4 shrink-0" style={{ color: gold }} /> : <Plus className="h-4 w-4 shrink-0" style={{ color: gold }} />}
              </button>
              {open === i && (
                <p className="pb-6 -mt-1 text-[15px] leading-relaxed max-w-2xl" style={{ ...sans, color: "#4A423A" }}>{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="join" className="max-w-[860px] mx-auto px-5 sm:px-8 pb-24 scroll-mt-20">
        <Reveal>
          <LeadForm
            source="anousha-circle"
            defaultIntent="invest"
            heading="Not sure which tier?"
            sub="Tell me what you're working on this year and I'll point you at the right room — or tell you to wait."
          />
        </Reveal>
      </section>
    </AnoushaShell>
  );
}
