import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { ARTIST_ROSTER } from "@/data/artistRoster";
import ArtistSectionNav from "./ArtistSectionNav";
import ArtistDisclaimers from "./ArtistDisclaimers";
import { Clock, GraduationCap, PlayCircle } from "lucide-react";

export default function ArtistCoursesPage() {
  const { slug = "", courseSlug } = useParams();
  const artist = ARTIST_ROSTER.find((a) => a.slug === slug || (a.aliases ?? []).includes(slug));

  useEffect(() => {
    if (artist) document.title = `${artist.displayName} — Courses · UPLY`;
  }, [artist]);

  if (!artist) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <p className="opacity-60">Artist not found.</p>
      </main>
    );
  }

  const courses = artist.courses ?? [];
  const course = courseSlug ? courses.find((c) => c.slug === courseSlug) : null;

  if (course) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <ArtistSectionNav artist={artist} />
        <article className="max-w-[760px] mx-auto px-6 pt-12 pb-24">
          <Link to={`/${artist.slug}/courses`} className="text-[12px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100">
            ← All courses
          </Link>
          {course.coverUrl && (
            <div className="mt-6 rounded-2xl overflow-hidden border border-white/10">
              <img
                src={course.coverUrl}
                alt={`${course.title} cover`}
                width={1280}
                height={800}
                loading="lazy"
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          {(() => {
            const isNonProfit = course.priceUsd === 0;
            return (
              <>
                <p className="mt-6 text-[11px] uppercase tracking-[0.28em]" style={{ color: artist.accent }}>
                  {isNonProfit
                    ? `${course.level} · Non-profit · ${course.duration}`
                    : `${course.level} · ${course.lessons} lessons · ${course.duration}`}
                </p>
                <h1 className="mt-3 font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(36px, 6vw, 56px)" }}>
                  {course.title}
                </h1>
                <p className="mt-4 text-[17px] opacity-85">{course.summary}</p>

                <div className="mt-8 rounded-2xl p-6 bg-white/5 border border-white/10">
                  <h2 className="text-sm uppercase tracking-[0.2em] mb-4 opacity-80">
                    {isNonProfit ? "Our mission" : "What you'll learn"}
                  </h2>
                  <ol className="space-y-2">
                    {course.outline.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-[15px]">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
                          style={{ background: `${artist.accent}22`, color: artist.accent }}
                        >
                          {i + 1}
                        </span>
                        <span className="opacity-90 pt-1">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    {isNonProfit ? (
                      <>
                        <div className="text-3xl font-bold" style={{ color: artist.accent }}>Donate</div>
                        <div className="text-[12px] opacity-60">100% supports the foundation</div>
                      </>
                    ) : (
                      <>
                        <div className="text-3xl font-bold" style={{ color: artist.accent }}>${course.priceUsd}</div>
                        <div className="text-[12px] opacity-60">one-time · lifetime access</div>
                      </>
                    )}
                  </div>
                  <Link
                    to="/auth"
                    className="px-6 py-3.5 rounded-full font-semibold inline-flex items-center gap-2"
                    style={{ background: artist.accent, color: "#0a0a0a" }}
                  >
                    <PlayCircle className="w-4 h-4" /> {isNonProfit ? "Support the foundation" : "Enroll now"}
                  </Link>
                </div>
              </>
            );
          })()}
          <ArtistDisclaimers artist={artist} className="mt-12 pt-6 border-t border-white/10" />
        </article>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <ArtistSectionNav artist={artist} />
      <section
        className="px-6 pt-16 pb-12 text-center"
        style={{ background: `radial-gradient(70% 80% at 50% 0%, ${artist.gradient.from}, ${artist.gradient.to} 70%)` }}
      >
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: artist.accent }}>Learn from {artist.displayName}</p>
        <h1 className="mt-3 font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(40px, 8vw, 72px)" }}>
          Courses
        </h1>
      </section>

      <div className="max-w-[920px] mx-auto px-6 py-14 grid sm:grid-cols-2 gap-4">
        {courses.length === 0 && (
          <p className="col-span-full text-center opacity-60">
            No courses published yet. Check back soon.
          </p>
        )}
        {courses.map((c) => (
          <Link
            key={c.slug}
            to={`/${artist.slug}/courses/${c.slug}`}
            className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex flex-col"
          >
            {c.coverUrl && (
              <img
                src={c.coverUrl}
                alt=""
                width={1280}
                height={800}
                loading="lazy"
                className="w-full aspect-[16/10] object-cover"
              />
            )}
            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] opacity-70 mb-3">
                <GraduationCap className="w-3.5 h-3.5" /> {c.level}
                <span>·</span>
                <Clock className="w-3.5 h-3.5" /> {c.duration}
              </div>
              <h2 className="text-lg font-semibold" style={{ fontFamily: "Fraunces, Georgia, serif" }}>{c.title}</h2>
              <p className="mt-2 text-[14px] opacity-75 flex-1">{c.summary}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-[12px] opacity-60">{c.priceUsd === 0 ? "Non-profit" : `${c.lessons} lessons`}</div>
                <div className="font-bold" style={{ color: artist.accent }}>{c.priceUsd === 0 ? "Donate" : `$${c.priceUsd}`}</div>
              </div>
            </div>
          </Link>
        ))}
        <ArtistDisclaimers artist={artist} className="col-span-full pt-6" />
      </div>
    </main>
  );
}
