import { useState } from "react";
import { Check, Minus, Plus, PlayCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AnoushaShell, CTA, Display, Eyebrow, LeadForm, Reveal, gold, ink, sans, serif } from "./shell";
import { IMAGES, MODULES, OUTCOMES } from "./content";

const LESSON_COUNT = MODULES.reduce((n, m) => n + m.lessons.length, 0);

export default function AnoushaBlueprint() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <AnoushaShell overHero sticky={<CTA to="/anousha/circle#tiers" className="w-full">Enroll in The Blueprint</CTA>}>
      <SEOHead
        title="The Blueprint — Real Estate Classroom by Anousha Nikjouian"
        description={`A ${MODULES.length}-module, ${LESSON_COUNT}-lesson DMV real estate curriculum: foundations, first purchase, first investment, scaling rentals, flipping, and the ten-year wealth plan.`}
        image={IMAGES.about}
      />

      {/* hero */}
      <section className="relative -mt-[72px]">
        <div className="relative min-h-[70vh] flex items-end overflow-hidden">
          <img src={IMAGES.hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,17,14,.62) 0%, rgba(20,17,14,.45) 40%, rgba(20,17,14,.88) 100%)" }} />
          <div className="relative max-w-[1240px] mx-auto px-5 sm:px-8 pb-20 pt-32">
            <Reveal>
              <p className="text-[11px] tracking-[0.32em] uppercase mb-5" style={{ ...sans, color: "#E6D2AE" }}>The Blueprint · Classroom</p>
              <h1 className="text-[11vw] sm:text-[68px] leading-[0.98]" style={{ ...serif, color: "#FBF7F1" }}>
                The whole playbook,
                <br />in order.
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-relaxed" style={{ ...sans, color: "rgba(251,247,241,.82)" }}>
                {MODULES.length} modules · {LESSON_COUNT} lessons. From understanding three jurisdictions to writing
                your own ten-year plan — built from a decade of buying, renting, flipping and managing in the DMV.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CTA to="/anousha/circle#tiers" variant="gold">Enroll via Investor Circle</CTA>
                <CTA href="#curriculum" variant="outline" className="!border-white/40 !text-white hover:!bg-white hover:!text-[#14110E]">
                  See the curriculum
                </CTA>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* outcomes */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24 grid md:grid-cols-[.9fr_1.1fr] gap-12">
        <Reveal>
          <Eyebrow>What you'll learn</Eyebrow>
          <Display className="text-[34px] sm:text-[44px]">You leave with a plan, not a mood.</Display>
        </Reveal>
        <Reveal delay={120}>
          <ul className="grid gap-4">
            {OUTCOMES.map((o) => (
              <li key={o} className="flex gap-3 text-[16px] leading-relaxed border-b border-[#14110E]/10 pb-4" style={{ ...sans, color: "#4A423A" }}>
                <Check className="h-5 w-5 shrink-0 mt-0.5" style={{ color: gold }} />
                {o}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* curriculum */}
      <section id="curriculum" className="border-y border-[#14110E]/10 scroll-mt-20" style={{ background: "#F3EDE4" }}>
        <div className="max-w-[980px] mx-auto px-5 sm:px-8 py-24">
          <Reveal>
            <Eyebrow>Curriculum</Eyebrow>
            <Display className="text-[34px] sm:text-[46px]">{MODULES.length} modules · {LESSON_COUNT} lessons</Display>
          </Reveal>
          <div className="mt-12 border-t border-[#14110E]/12">
            {MODULES.map((m, i) => (
              <div key={m.n} className="border-b border-[#14110E]/12">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-start justify-between gap-5 py-7 text-left"
                >
                  <span className="flex gap-5 min-w-0">
                    <span className="text-[13px] pt-2" style={{ ...sans, color: gold }}>{m.n}</span>
                    <span className="min-w-0">
                      <span className="block text-[21px] sm:text-[24px]" style={{ ...serif, color: ink }}>{m.title}</span>
                      <span className="block mt-1 text-[14px]" style={{ ...sans, color: "#6B625A" }}>{m.blurb}</span>
                      <span className="block mt-2 text-[11px] tracking-[0.18em] uppercase" style={{ ...sans, color: "#8A8078" }}>
                        {m.lessons.length} lessons
                      </span>
                    </span>
                  </span>
                  {open === i ? <Minus className="h-4 w-4 shrink-0 mt-2" style={{ color: gold }} /> : <Plus className="h-4 w-4 shrink-0 mt-2" style={{ color: gold }} />}
                </button>
                {open === i && (
                  <ul className="pb-7 pl-0 sm:pl-10 grid gap-2">
                    {m.lessons.map((l, li) => (
                      <li key={l} className="flex items-center gap-3 py-2 px-4 border border-[#14110E]/10" style={{ background: "#FFFDFA" }}>
                        <PlayCircle className="h-4 w-4 shrink-0" style={{ color: gold }} />
                        <span className="text-[14px]" style={{ ...sans, color: "#4A423A" }}>
                          {m.n}.{li + 1} — {l}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* who it's for + instructor */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24 grid md:grid-cols-2 gap-14">
        <Reveal>
          <Eyebrow>Who it's for</Eyebrow>
          <Display className="text-[30px]">Three people get the most out of this.</Display>
          <ul className="mt-6 space-y-5">
            {[
              ["The renter who's tired of guessing.", "You want to buy in the next 12–24 months and you'd like to stop taking advice from group chats."],
              ["The first-time investor.", "You own one property, or none, and you want the second one to actually make money."],
              ["The accidental landlord.", "You kept a place when you moved and you're running it on instinct. Let's turn it into a system."],
            ].map(([t, c]) => (
              <li key={t} className="border-l pl-5" style={{ borderColor: gold }}>
                <p className="text-[18px]" style={{ ...serif, color: ink }}>{t}</p>
                <p className="mt-1 text-[15px] leading-relaxed" style={{ ...sans, color: "#4A423A" }}>{c}</p>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120}>
          <div className="h-full p-10 border border-[#14110E]/12" style={{ background: "#FFFDFA" }}>
            <div className="flex items-center gap-4">
              <img src={IMAGES.portrait} alt="Anousha Nikjouian" className="h-16 w-16 rounded-full object-cover" />
              <div>
                <p className="text-[20px]" style={{ ...serif, color: ink }}>Anousha Nikjouian</p>
                <p className="text-[11px] tracking-[0.18em] uppercase mt-1" style={{ ...sans, color: gold }}>REALTOR® · Compass, Chevy Chase</p>
              </div>
            </div>
            <p className="mt-6 text-[15px] leading-[1.75]" style={{ ...sans, color: "#4A423A" }}>
              Licensed in DC, Maryland and Virginia. First condo in my early twenties; since then, nearly 200
              luxury rentals managed with a team, flips, wholesale deals, Airbnb setups and Section 8 placements.
              I teach the whole playbook, then help you run it.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-[#14110E]/10 pt-6">
              {[["10+", "Years"], ["200", "Units managed"], ["3", "Jurisdictions"]].map(([n, l]) => (
                <div key={l}>
                  <p className="text-[28px]" style={{ ...serif, color: ink }}>{n}</p>
                  <p className="text-[10px] tracking-[0.18em] uppercase mt-1" style={{ ...sans, color: "#8A8078" }}>{l}</p>
                </div>
              ))}
            </div>
            <CTA to="/anousha/circle#tiers" className="mt-8 w-full">Enroll in The Blueprint</CTA>
          </div>
        </Reveal>
      </section>

      <section className="max-w-[860px] mx-auto px-5 sm:px-8 pb-24">
        <Reveal>
          <LeadForm
            source="anousha-blueprint"
            defaultIntent="invest"
            heading="Questions before you enroll?"
            sub="Tell me your situation and I'll tell you honestly whether the course is the right next step."
          />
        </Reveal>
      </section>
    </AnoushaShell>
  );
}
