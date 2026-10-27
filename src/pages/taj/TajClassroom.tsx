import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { TajShell, Display, Eyebrow, cinzel, gold } from "./shell";
import {
  LESSON_COUNT,
  MEMBERSHIP,
  MODULES,
  adjacentLessons,
  findLesson,
  lessonHref,
} from "./content";

const DONE_KEY = "taj-classroom-done";

function readDone(): string[] {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function TajClassroom() {
  const { pathname } = useLocation();
  const parts = pathname.replace(/^\/(taj-fencing|tajfencing)/, "/taj").split("/").filter(Boolean);
  // /taj/classroom/:module/:lesson
  const moduleSlug = parts[2];
  const lessonSlug = parts[3];
  const { mod, lesson } = findLesson(moduleSlug, lessonSlug);
  const [done, setDone] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(moduleSlug || MODULES[0].slug);

  useEffect(() => {
    setDone(readDone());
  }, []);

  useEffect(() => {
    if (moduleSlug) setOpen(moduleSlug);
  }, [moduleSlug]);

  const neighbors = useMemo(
    () => (mod && lesson ? adjacentLessons(mod.slug, lesson.slug) : null),
    [mod, lesson],
  );

  const lessonId = mod && lesson ? `${mod.slug}/${lesson.slug}` : "";
  const complete = lessonId ? done.includes(lessonId) : false;

  function toggleComplete() {
    if (!lessonId) return;
    const next = complete ? done.filter((id) => id !== lessonId) : [...done, lessonId];
    setDone(next);
    localStorage.setItem(DONE_KEY, JSON.stringify(next));
  }

  return (
    <TajShell>
      <SEOHead
        title={lesson ? `${lesson.title} — TAJ Classroom` : "Classroom — TAJ Fencing Club"}
        description={`${MODULES.length} modules and ${LESSON_COUNT} lessons from TAJ Fencing Club: the meaning of Taj, épée, programs, and how to begin in Reston.`}
      />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Classroom</Eyebrow>
            <Display className="text-[36px] sm:text-[52px]">The club, in order.</Display>
          </div>
          <p className="text-[13px] tracking-[0.14em] uppercase text-white/55">
            {done.length} of {LESSON_COUNT} marked read
          </p>
        </div>
        <div className="mt-4 h-px w-full bg-white/10">
          <div
            className="h-px"
            style={{ width: `${LESSON_COUNT ? (done.length / LESSON_COUNT) * 100 : 0}%`, background: gold }}
          />
        </div>

        <div className="mt-10 grid lg:grid-cols-[320px_1fr] gap-8 items-start">
          <aside className="border border-[#E4C98A]/20">
            {MODULES.map((m) => {
              const expanded = open === m.slug;
              return (
                <div key={m.slug} className="border-b border-white/10 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : m.slug)}
                    className="w-full text-left px-4 py-4 flex items-start justify-between gap-3"
                  >
                    <span>
                      <span className="block text-[16px]" style={cinzel}>{m.title}</span>
                      <span className="block mt-1 text-[12px] text-white/50">{m.lessons.length} lessons</span>
                    </span>
                    <ChevronRight className={`h-4 w-4 mt-1 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} style={{ color: gold }} />
                  </button>
                  {expanded && (
                    <ul className="pb-3">
                      {m.lessons.map((l) => {
                        const id = `${m.slug}/${l.slug}`;
                        const active = id === lessonId;
                        return (
                          <li key={l.slug}>
                            <Link
                              to={lessonHref(m.slug, l.slug)}
                              className="flex items-center gap-2 px-4 py-2 text-[14px]"
                              style={{ color: active ? gold : "rgba(244,239,230,0.82)", background: active ? "rgba(228,201,138,0.08)" : undefined }}
                            >
                              {done.includes(id) ? (
                                <Check className="h-3.5 w-3.5 shrink-0" style={{ color: gold }} />
                              ) : (
                                <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/25" />
                              )}
                              {l.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </aside>

          <article className="min-w-0 border border-[#E4C98A]/20 p-6 sm:p-10" style={{ background: "#0C0E14" }}>
            {lesson && mod && neighbors ? (
              <>
                <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: gold }}>
                  {mod.title} · {neighbors.index + 1} of {neighbors.total}
                </p>
                <h1 className="mt-3 text-[32px] sm:text-[44px] leading-[1.05]" style={cinzel}>{lesson.title}</h1>
                <div className="mt-8 space-y-5 text-[17px] leading-[1.75] text-white/85 max-w-[68ch]">
                  {lesson.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleComplete}
                    className="h-11 px-5 text-[12px] tracking-[0.14em] uppercase font-semibold border"
                    style={{
                      borderColor: gold,
                      background: complete ? gold : "transparent",
                      color: complete ? "#1A140C" : gold,
                    }}
                  >
                    {complete ? "Marked read" : "Mark as read"}
                  </button>
                  {neighbors.prev && (
                    <Link to={lessonHref(neighbors.prev.module.slug, neighbors.prev.lesson.slug)} className="h-11 px-4 inline-flex items-center text-[13px] text-white/70 hover:text-white">
                      ← {neighbors.prev.lesson.title}
                    </Link>
                  )}
                  {neighbors.next && (
                    <Link
                      to={lessonHref(neighbors.next.module.slug, neighbors.next.lesson.slug)}
                      className="h-11 px-5 inline-flex items-center text-[12px] tracking-[0.14em] uppercase font-semibold ml-auto"
                      style={{ background: gold, color: "#1A140C" }}
                    >
                      Next lesson
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: gold }}>Start here</p>
                <h1 className="mt-3 text-[32px] sm:text-[44px] leading-[1.05]" style={cinzel}>
                  {MODULES.length} modules · {LESSON_COUNT} lessons
                </h1>
                <p className="mt-4 text-[16px] leading-relaxed text-white/75 max-w-xl">
                  Open any lesson. The words are the club’s — the story of Taj, épée, each program, the schedule, and how to begin. Nothing here is a stand-in coach or a made-up result.
                </p>
                <Link
                  to={lessonHref(MODULES[0].slug, MODULES[0].lessons[0].slug)}
                  className="mt-8 inline-flex h-12 px-6 items-center text-[12px] tracking-[0.16em] uppercase font-semibold"
                  style={{ background: gold, color: "#1A140C" }}
                >
                  Begin with The name Taj
                </Link>
                <p className="mt-6 text-[13px] text-white/55">
                  Members join from the club page. {MEMBERSHIP.display}.
                </p>
              </>
            )}
          </article>
        </div>
      </div>
    </TajShell>
  );
}
