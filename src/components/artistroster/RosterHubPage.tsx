import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import { BadgeCheck, ArrowRight } from "lucide-react";
import BackButton from "@/components/common/BackButton";

/**
 * Public discovery hub listing every artist on UPLY's managed roster.
 * Lives at /roster. Each card links into the artist's unified surface
 * (links / site / blog / community / courses).
 */
export default function RosterHubPage() {
  useEffect(() => {
    document.title = "Roster — Artists on UPLY";
  }, []);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <BackButton fallback="/" />
      <section className="px-6 pt-20 pb-12 text-center max-w-3xl mx-auto">

        <p className="text-[11px] uppercase tracking-[0.3em] text-[#00FF85]">UPLY Roster</p>
        <h1
          className="mt-3 font-bold"
          style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(40px, 8vw, 80px)", lineHeight: 0.95 }}
        >
          Artists building their universe on UPLY
        </h1>
        <p className="mt-5 text-[16px] opacity-75">
          Every artist below has their site, links, blog, community, and courses in one place — synced, searchable, and powered by UPLY.
        </p>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ARTIST_ROSTER.map((a) => {
          let sections: string[];
          if (a.sectionsOverride?.length) {
            sections = a.sectionsOverride;
          } else {
            sections = ["Links", "Site"];
            if (a.posts?.length) sections.push("Blog");
            if (a.community) sections.push("Community");
            if (a.courses?.length) sections.push("Courses");
          }


          return (
            <Link
              key={a.slug}
              to={`/${a.slug}`}
              className="group rounded-3xl overflow-hidden border border-white/10 hover:border-white/25 transition-all hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(160deg, ${a.gradient.from}, ${a.gradient.to})`,
              }}
            >
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] uppercase tracking-[0.22em] opacity-75" style={{ color: a.accent }}>
                    {a.eyebrow}
                  </p>
                  {a.verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: a.accent }} />}
                </div>
                <h2
                  className="font-bold leading-[1] mb-3"
                  style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(28px, 5vw, 40px)" }}
                >
                  {a.displayName}
                </h2>
                <p className="text-[14px] opacity-85 mb-6 line-clamp-2">{a.tagline}</p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {sections.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full bg-white/10 border border-white/10"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between text-[12px]">
                  <span className="opacity-70">{a.location}</span>
                  <span className="inline-flex items-center gap-1 font-semibold group-hover:gap-2 transition-all" style={{ color: a.accent }}>
                    Explore <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
