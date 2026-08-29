import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, KeyRound, TrendingUp, ArrowUpRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AnoushaShell, CTA, Display, Eyebrow, GoldRule, LeadForm, Reveal, gold, ink, sans, serif } from "./shell";
import { BRAND, IMAGES, NEIGHBORHOODS, POSTS, SERVICES, TESTIMONIALS, TRUST } from "./content";

const ICONS: Record<string, any> = { buy: Home, sell: KeyRound, invest: TrendingUp };

export default function AnoushaHome() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#work") {
      document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash]);

  return (
    <AnoushaShell
      sticky={<CTA to="/anousha#work" className="w-full">Work with Anousha</CTA>}
    >
      <SEOHead
        title="Anousha Nikjouian — DMV Real Estate, Defined"
        description="DMV-native REALTOR® at Compass, licensed in DC, MD & VA. Luxury real estate, investment strategy, and education for first-time buyers and portfolio builders — plus The Defined Circle community and The Blueprint classroom on UPLY."
        image={IMAGES.hero}
        type="profile"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: BRAND.name,
          jobTitle: "REALTOR®",
          areaServed: ["Washington DC", "Maryland", "Virginia"],
          url: "https://uply.tv/anousha",
          sameAs: [BRAND.instagram],
        }}
      />

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative -mt-[72px]">
        <div className="relative h-[92vh] min-h-[600px] w-full overflow-hidden">
          <img src={IMAGES.hero} alt="Golden-hour luxury home in the Washington DC metro area" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,17,14,.55) 0%, rgba(20,17,14,.28) 40%, rgba(20,17,14,.78) 100%)" }} />
          <div className="relative h-full max-w-[1240px] mx-auto px-5 sm:px-8 flex items-end pb-16 sm:pb-24">
            <div className="w-full grid md:grid-cols-[1.4fr_.9fr] gap-10 items-end">
              <Reveal>
                <p className="text-[11px] tracking-[0.32em] uppercase mb-5" style={{ ...sans, color: "#E6D2AE" }}>
                  {BRAND.wordmark} · {BRAND.markets}
                </p>
                <h1 className="text-[13vw] sm:text-[76px] leading-[0.95] tracking-[-0.02em]" style={{ ...serif, color: "#FBF7F1" }}>
                  Luxury real estate,
                  <br />
                  <em className="not-italic" style={{ color: "#E6D2AE" }}>defined.</em>
                </h1>
                <p className="mt-6 max-w-lg text-[16px] leading-relaxed" style={{ ...sans, color: "rgba(251,247,241,.82)" }}>
                  I'm Anousha — DMV native, REALTOR® at Compass, and an investor who owns what she advises.
                  Real estate here is a wealth plan, not a transaction.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <CTA to="/anousha#work" variant="gold">Work with Anousha</CTA>
                  <CTA to="/anousha/circle" variant="outline" className="!border-white/40 !text-white hover:!bg-white hover:!text-[#14110E]">
                    Join Defined Circle
                  </CTA>
                </div>
              </Reveal>
              <Reveal delay={160} className="hidden md:block">
                {/* Portrait slot — swap for her headshot */}
                <div className="relative aspect-[3/4] w-full max-w-[300px] ml-auto overflow-hidden">
                  <img src={IMAGES.portrait} alt="Anousha Nikjouian" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 border border-[#E6D2AE]/50 m-3 pointer-events-none" />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- trust */}
      <section className="border-b border-[#14110E]/10" style={{ background: "#F3EDE4" }}>
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8 grid grid-cols-2 md:grid-cols-5 gap-y-6 gap-x-4">
          {TRUST.map((t) => (
            <div key={t.k} className="text-center md:text-left">
              <p className="text-[15px]" style={{ ...serif, color: ink }}>{t.k}</p>
              <p className="text-[11px] tracking-[0.1em] uppercase mt-1" style={{ ...sans, color: "#8A8078" }}>{t.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------------- about */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24 sm:py-32 grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
        <Reveal>
          <div className="relative aspect-[4/3] overflow-hidden">
            <img src={IMAGES.about} alt="Elegant residential interior in the DMV" className="h-full w-full object-cover" />
          </div>
        </Reveal>
        <Reveal delay={120}>
          <Eyebrow>About</Eyebrow>
          <Display className="text-[34px] sm:text-[46px]">
            She doesn't just sell homes.
            <br />She builds wealth with them.
          </Display>
          <div className="mt-6 space-y-4 text-[16px] leading-[1.75]" style={{ ...sans, color: "#4A423A" }}>
            <p>
              I bought my first condo in my early twenties, before I had any business feeling confident about it.
              Ten years later I've managed nearly 200 luxury rentals with my team, flipped, wholesaled, set up
              Airbnbs, and placed Section 8 tenants across the region.
            </p>
            <p>
              That's the difference in how I represent clients. I've been on both sides of the ledger — the agent
              writing the offer and the owner living with it four years later. So we talk about carrying cost,
              exit, and what the property does for your next one, not just whether you love the kitchen.
            </p>
            <p>Licensed in DC, Maryland and Virginia. Born here. Still here.</p>
          </div>
          <div className="mt-8"><GoldRule /></div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ services */}
      <section style={{ background: "#F3EDE4" }} className="border-y border-[#14110E]/10">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24">
          <Reveal>
            <Eyebrow>How we work together</Eyebrow>
            <Display className="text-[34px] sm:text-[46px] max-w-2xl">Buy. Sell. Invest.</Display>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {SERVICES.map((s, i) => {
              const Icon = ICONS[s.id];
              return (
                <Reveal key={s.id} delay={i * 100}>
                  <div className="h-full flex flex-col p-8 border border-[#14110E]/12 hover:border-[#B08D57] transition-colors duration-500" style={{ background: "#FFFDFA" }}>
                    <Icon className="h-6 w-6" style={{ color: gold }} />
                    <p className="mt-6 text-[11px] tracking-[0.24em] uppercase" style={{ ...sans, color: "#8A8078" }}>{s.label}</p>
                    <Display className="text-[26px] mt-2">{s.title}</Display>
                    <p className="mt-4 text-[15px] leading-relaxed flex-1" style={{ ...sans, color: "#4A423A" }}>{s.copy}</p>
                    <ul className="mt-6 space-y-2">
                      {s.points.map((p) => (
                        <li key={p} className="text-[13px] flex gap-2" style={{ ...sans, color: "#4A423A" }}>
                          <span style={{ color: gold }}>—</span> {p}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/anousha#work"
                      className="mt-7 inline-flex items-center gap-2 text-[12px] tracking-[0.16em] uppercase hover:gap-3 transition-all"
                      style={{ ...sans, color: ink }}
                    >
                      {s.cta} <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- neighborhoods */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24">
        <Reveal>
          <Eyebrow>Featured neighborhoods</Eyebrow>
          <Display className="text-[34px] sm:text-[46px] max-w-2xl">The blocks I know by heart.</Display>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {NEIGHBORHOODS.map((n, i) => (
            <Reveal key={n.name} delay={i * 70} className={i === 0 ? "col-span-2 md:col-span-1" : ""}>
              <div className="group relative aspect-[4/5] overflow-hidden">
                <img
                  src={n.img}
                  alt={`${n.name} homes`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,17,14,0) 45%, rgba(20,17,14,.8) 100%)" }} />
                <div className="absolute bottom-0 p-4">
                  <p className="text-[18px]" style={{ ...serif, color: "#FBF7F1" }}>{n.name}</p>
                  <p className="text-[11px] mt-1" style={{ ...sans, color: "rgba(251,247,241,.72)" }}>{n.note}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- testimonials */}
      <section style={{ background: "#14110E" }}>
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24">
          <Reveal>
            <p className="text-[11px] tracking-[0.28em] uppercase mb-4" style={{ ...sans, color: gold }}>Clients</p>
            <h2 className="text-[34px] sm:text-[46px] leading-tight" style={{ ...serif, color: "#FBF7F1" }}>
              Process over promises.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.who} delay={i * 110}>
                <div className="border-t border-[#B08D57]/40 pt-6">
                  <p className="text-[19px] leading-[1.6]" style={{ ...serif, color: "rgba(251,247,241,.92)" }}>
                    “{t.quote}”
                  </p>
                  <p className="mt-5 text-[11px] tracking-[0.18em] uppercase" style={{ ...sans, color: "#B08D57" }}>
                    {t.who} · {t.where}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- offer strip */}
      <section className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24 grid gap-6 md:grid-cols-2">
        <Reveal>
          <Link to="/anousha/circle" className="group block h-full p-10 border border-[#14110E]/12 hover:border-[#B08D57] transition-colors duration-500" style={{ background: "#FFFDFA" }}>
            <Eyebrow>Community</Eyebrow>
            <Display className="text-[30px]">The Defined Circle</Display>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ ...sans, color: "#4A423A" }}>
              The room where DMV wealth gets built — first-time buyers, first-time investors, and portfolio
              builders. Three tiers from $19/mo. Inner Keys capped at 25 seats.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 text-[12px] tracking-[0.16em] uppercase group-hover:gap-3 transition-all" style={{ ...sans, color: ink }}>
              See the tiers <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </Reveal>
        <Reveal delay={110}>
          <Link to="/anousha/blueprint" className="group block h-full p-10 border border-[#14110E]/12 hover:border-[#B08D57] transition-colors duration-500" style={{ background: "#FFFDFA" }}>
            <Eyebrow>Classroom</Eyebrow>
            <Display className="text-[30px]">The Blueprint</Display>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ ...sans, color: "#4A423A" }}>
              Six modules, 33 lessons: foundations, first purchase, first investment, scaling rentals, flipping,
              and the ten-year wealth plan. The whole playbook, in order.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 text-[12px] tracking-[0.16em] uppercase group-hover:gap-3 transition-all" style={{ ...sans, color: ink }}>
              View the curriculum <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </Reveal>
      </section>

      {/* --------------------------------------------------------------- blog */}
      <section style={{ background: "#F3EDE4" }} className="border-y border-[#14110E]/10">
        <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-24">
          <Reveal>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <Eyebrow>The Journal</Eyebrow>
                <Display className="text-[34px] sm:text-[46px]">Latest notes</Display>
              </div>
              <Link to="/anousha/blog" className="text-[12px] tracking-[0.16em] uppercase hover:opacity-60 transition" style={{ ...sans, color: ink }}>
                All articles →
              </Link>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {POSTS.slice(0, 3).map((p, i) => (
              <Reveal key={p.slug} delay={i * 100}>
                <Link to={`/anousha/blog/${p.slug}`} className="group block">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                  </div>
                  <p className="mt-5 text-[11px] tracking-[0.2em] uppercase" style={{ ...sans, color: gold }}>{p.tag} · {p.readTime}</p>
                  <Display className="text-[22px] mt-2 group-hover:opacity-70 transition-opacity">{p.title}</Display>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- lead */}
      <section id="work" className="max-w-[860px] mx-auto px-5 sm:px-8 py-24 scroll-mt-20">
        <Reveal>
          <LeadForm source="anousha-profile" />
        </Reveal>
      </section>
    </AnoushaShell>
  );
}
