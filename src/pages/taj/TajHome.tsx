import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { TajShell, Display, Eyebrow, cinzel, gold } from "./shell";
import {
  ASSETS,
  BRAND,
  LESSON_COUNT,
  MEMBERSHIP,
  MODULES,
  PROGRAMS,
  QUALITIES,
  TEAM,
  VALUES,
} from "./content";

export default function TajHome() {
  return (
    <TajShell overHero>
      <SEOHead
        title="TAJ Fencing Club — Premier Épée Fencing in Reston, VA"
        description="TAJ Fencing Club in Reston, VA. Elite épée for ages 5+, beginners through competitive. Fence Your Limits. Precision. Honor. Excellence."
        image={ASSETS.hero}
        type="profile"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SportsClub",
          name: BRAND.name,
          sport: "Épée fencing",
          slogan: BRAND.slogan,
          url: "https://uply.tv/taj",
          email: BRAND.email,
          telephone: "+1-202-538-5363",
          address: {
            "@type": "PostalAddress",
            streetAddress: "1914 Association Drive",
            addressLocality: "Reston",
            addressRegion: "VA",
            postalCode: "20191",
            addressCountry: "US",
          },
          sameAs: [BRAND.instagram, BRAND.linkedin, BRAND.facebook, BRAND.site],
        }}
      />

      <section className="relative min-h-[100svh] flex items-end">
        <img
          src={ASSETS.hero}
          alt="Épée fencer in mask, blade raised, in gold light"
          className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,8,12,0.35) 0%, rgba(7,8,12,0.2) 28%, rgba(7,8,12,0.78) 68%, #07080C 100%), linear-gradient(90deg, rgba(7,8,12,0.82) 0%, rgba(7,8,12,0.35) 58%, rgba(7,8,12,0.15) 100%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 pt-28 pb-16 w-full grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-end">
          <div>
            <img src={ASSETS.logo} alt="TAJ Fencing Club crest" className="h-36 sm:h-44 w-auto object-contain -ml-2" />
            <p className="mt-6 text-[11px] tracking-[0.34em] uppercase" style={{ color: gold }}>
              {BRAND.premier}
            </p>
            <h1 className="mt-4 text-[15vw] sm:text-[84px] leading-[0.9]" style={cinzel}>
              Fence
              <br />
              your limits.
            </h1>
            <p className="mt-5 max-w-xl text-[16px] sm:text-[18px] leading-relaxed text-white/80">
              Elite épée fencing for ages 5 and up — beginners through competitive. Equipment is provided for beginners.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/taj/join#membership"
                className="h-12 px-6 inline-flex items-center text-[12px] tracking-[0.16em] uppercase font-semibold"
                style={{ background: gold, color: "#1A140C" }}
              >
                Join Taj Club
              </Link>
              <Link
                to="/taj/classroom"
                className="h-12 px-6 inline-flex items-center text-[12px] tracking-[0.16em] uppercase border border-[#E4C98A]/50 text-[#F4EFE6]"
              >
                Enter the classroom
              </Link>
            </div>
            <p className="mt-4 text-[13px] tracking-[0.08em]" style={{ color: gold }}>
              {MEMBERSHIP.display}
            </p>
          </div>
          <div className="hidden lg:block justify-self-end w-full max-w-sm border border-[#E4C98A]/30 bg-black/40 backdrop-blur-md p-6">
            <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: gold }}>
              {BRAND.tagline}
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-white/85">
              {BRAND.meaning} The mask you put on is the crown you wear with pride, honor, and purpose.
            </p>
            <dl className="mt-6 grid gap-3 text-[13px]">
              {BRAND.hours.map((h) => (
                <div key={h.day} className="flex justify-between gap-4 border-t border-white/10 pt-3">
                  <dt className="text-white/60">{h.day}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                <dt className="text-white/60">Reston, VA</dt>
                <dd className="text-right">Ages 5+</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E4C98A]/20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px] tracking-[0.08em] uppercase text-white/75">
          <p>1914 Association Drive</p>
          <p>Reston, VA 20191</p>
          <a href={BRAND.phoneHref} className="hover:text-[#E4C98A]">{BRAND.phone}</a>
          <p>Mon–Fri 3–9:30 · Sat 9–2</p>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 sm:py-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-12">
        <div>
          <Eyebrow>Our story</Eyebrow>
          <Display className="text-[34px] sm:text-[48px]">Where legacy meets the strip.</Display>
          <p className="mt-4 text-[13px] tracking-[0.2em] uppercase text-white/50">
            Where historical legacy meets global diversity and athletic excellence
          </p>
        </div>
        <div className="space-y-5 text-[16px] leading-[1.75] text-white/80">
          <p>
            The name “Taj” (meaning Crown) represents the highest echelon of respect, honor, and human dignity. We chose the name Taj to serve as a daily reminder that within our walls, every individual is the ruler of their own destiny and deserving of utmost respect.
          </p>
          <p>
            Today, in the heart of the United States, Taj Fencing Club bridges this ancient philosophy with the modern world. We have built a dynamic, international, and fully inclusive community where everyone—from children and youth to adults from all corners of the globe—can thrive side by side.
          </p>
          <p>
            Our mission is to cultivate a safe, elite, and non-judgmental environment. We measure human value by only two standards: integrity in speech and excellence in conduct.
          </p>
        </div>
      </section>

      <section className="border-y border-[#E4C98A]/15" style={{ background: "#0C0E14" }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20">
          <Eyebrow>Programs</Eyebrow>
          <Display className="text-[34px] sm:text-[46px] max-w-xl">Every stage of a fencer’s journey.</Display>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROGRAMS.map((p, i) => (
              <article key={p.title} className="border border-[#E4C98A]/20 p-6 min-h-[220px] flex flex-col" style={{ background: "#10131A" }}>
                <p className="text-[11px] tracking-[0.22em]" style={{ color: gold }}>0{i + 1}</p>
                <h3 className="mt-4 text-[24px] leading-tight" style={cinzel}>{p.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/75 flex-1">{p.copy}</p>
              </article>
            ))}
            <article className="border border-[#E4C98A]/40 p-6 flex flex-col justify-between" style={{ background: "linear-gradient(180deg, #1A160F, #10131A)" }}>
              <div>
                <p className="text-[11px] tracking-[0.22em] uppercase" style={{ color: gold }}>Equipment</p>
                <h3 className="mt-4 text-[24px] leading-tight" style={cinzel}>Provided for beginners</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-white/75">
                  New and beginner students are provided with fencing equipment during training sessions.
                </p>
              </div>
              <Link to="/taj/join" className="mt-6 text-[12px] tracking-[0.16em] uppercase" style={{ color: gold }}>
                Join the club →
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <Eyebrow>Fencing · Épée</Eyebrow>
          <Display className="text-[34px] sm:text-[46px]">The chess of the human body.</Display>
          <div className="mt-6 space-y-4 text-[16px] leading-[1.75] text-white/80">
            <p>
              At our club, we specialize exclusively in épée—the purest and most tactical form of fencing. The entire body, from head to toe, is a valid target. The fencer who hits first scores. If both land a touch at the same time, both receive a point.
            </p>
            <p>
              On the strip we train for podium finishes. In life we shape leaders of character, integrity, resilience, and poise.
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {QUALITIES.map((q) => (
            <li key={q} className="border border-[#E4C98A]/20 px-4 py-5 text-[14px]" style={{ color: gold }}>
              {q}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-[#E4C98A]/15" style={{ background: "#0C0E14" }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20">
          <Eyebrow>Our team</Eyebrow>
          <Display className="text-[34px] sm:text-[46px]">Coaches and board.</Display>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEAM.map((person) => (
              <figure key={person.name} className="border border-white/10 bg-black/30">
                <img src={person.photo} alt={person.name} className="aspect-[4/5] w-full object-cover object-top" />
                <figcaption className="p-4">
                  <p className="text-[18px] leading-tight" style={cinzel}>{person.name}</p>
                  <p className="mt-2 text-[12px] tracking-[0.12em] uppercase" style={{ color: gold }}>{person.role}</p>
                  <p className="mt-1 text-[13px] text-white/60">{person.detail}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20">
        <Eyebrow>Core values</Eyebrow>
        <div className="grid md:grid-cols-3 gap-8">
          {VALUES.map((v) => (
            <div key={v.title} className="border-t border-[#E4C98A]/50 pt-5">
              <h3 className="text-[26px]" style={cinzel}>{v.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/75">{v.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#E4C98A]/15" style={{ background: "#0C0E14" }}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-[1fr_1fr] gap-12">
          <div>
            <Eyebrow>Classroom</Eyebrow>
            <Display className="text-[34px] sm:text-[46px]">
              {MODULES.length} modules. {LESSON_COUNT} lessons.
            </Display>
            <p className="mt-4 text-[16px] leading-relaxed text-white/75 max-w-md">
              Read the club in order — the meaning of Taj, the weapon, each program, and how to step on the strip in Reston.
            </p>
            <Link
              to="/taj/classroom"
              className="mt-8 inline-flex h-12 px-6 items-center text-[12px] tracking-[0.16em] uppercase font-semibold"
              style={{ background: gold, color: "#1A140C" }}
            >
              Browse the classroom
            </Link>
          </div>
          <ol className="divide-y divide-white/10 border-y border-white/10">
            {MODULES.map((m, i) => (
              <li key={m.slug}>
                <Link to={`/taj/classroom/${m.slug}/${m.lessons[0].slug}`} className="flex items-baseline justify-between gap-4 py-4 hover:text-[#E4C98A]">
                  <span className="text-[18px]" style={cinzel}>
                    <span className="text-[12px] mr-3 text-white/40" style={{ fontFamily: "Inter, sans-serif" }}>0{i + 1}</span>
                    {m.title}
                  </span>
                  <span className="text-[12px] tracking-[0.14em] uppercase text-white/45 shrink-0">
                    {m.lessons.length} {m.lessons.length === 1 ? "lesson" : "lessons"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20">
        <div className="border border-[#E4C98A]/40 p-8 sm:p-12 grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center" style={{ background: "radial-gradient(80% 80% at 100% 0%, rgba(228,201,138,0.16), transparent 50%), #10131A" }}>
          <div>
            <Eyebrow>Membership</Eyebrow>
            <Display className="text-[40px] sm:text-[56px]">{MEMBERSHIP.display}</Display>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/70">{MEMBERSHIP.note}</p>
            <p className="mt-4 text-[15px] text-white/80">No previous fencing experience is required.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to="/taj/join#membership"
              className="h-14 inline-flex items-center justify-center text-[13px] tracking-[0.18em] uppercase font-semibold"
              style={{ background: gold, color: "#1A140C" }}
            >
              Join Taj Club
            </Link>
            <a
              href={BRAND.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="h-12 inline-flex items-center justify-center text-[12px] tracking-[0.16em] uppercase border border-white/20"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </TajShell>
  );
}
