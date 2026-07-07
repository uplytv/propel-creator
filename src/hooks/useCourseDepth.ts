import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/* ═══════════════════════════════════════════════════════════════════════════
   Course depth (client side of migration 20260707010000):
     • Drip scheduling  — classroom_modules.drip_days; locked modules are
       invisible under RLS, so the teaser list comes from the SECURITY DEFINER
       my_drip_locked_modules() RPC (title + unlock_at only, no content).
     • Quizzes          — members never see correct_index: questions come from
       get_quiz_questions() (strips the key) and grading happens server-side
       in grade_quiz_attempt() (also the ONLY write path to quiz_attempts).
     • Resume position  — lesson_progress upserts throttled from the player.

   (supabase as any) casts: all of these tables/RPCs are new and not yet in the
   generated types.ts — remove casts after regenerating types.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Drip scheduling ── */

export interface DripLockedModule {
  module_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  drip_days: number;
  unlock_at: string;
  lesson_count: number;
}

/** Modules this member has (tier-qualified) access to but that are still inside their drip window. */
export function useDripLockedModules(creatorId: string | undefined, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["drip-locked-modules", creatorId, user?.id],
    enabled: !!creatorId && !!user && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<DripLockedModule[]> => {
      const { data, error } = await (supabase as any).rpc("my_drip_locked_modules", { p_creator_id: creatorId }); // cast: awaiting types regen (rpc my_drip_locked_modules)
      if (error) throw error;
      return (data || []) as DripLockedModule[];
    },
  });
}

/** Human label for a drip countdown, from the server-computed unlock timestamp. */
export function dripCountdownLabel(unlockAt: string): string {
  const ms = new Date(unlockAt).getTime() - Date.now();
  if (ms <= 0) return "Unlocks soon";
  const hours = Math.ceil(ms / 3_600_000);
  if (hours <= 24) return `Unlocks in ${hours}h`;
  const days = Math.ceil(ms / 86_400_000);
  return `Unlocks in ${days} day${days === 1 ? "" : "s"}`;
}

/* ── Quizzes ── */

export interface QuizQuestionDraft {
  /** DB id when loaded for editing; absent on new questions. */
  id?: string;
  question: string;
  options: string[];
  /** Only present on the creator path (direct table read). */
  correct_index: number;
}

export interface LessonQuizRow {
  id: string;
  lesson_id: string;
  pass_pct: number;
}

/** Quiz shell (id + pass_pct — no answers live on this row). Member-visible iff the lesson is. */
export function useLessonQuiz(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lesson-quiz", lessonId],
    enabled: !!lessonId,
    queryFn: async (): Promise<LessonQuizRow | null> => {
      const { data, error } = await (supabase as any) // cast: awaiting types regen (lesson_quizzes)
        .from("lesson_quizzes")
        .select("id, lesson_id, pass_pct")
        .eq("lesson_id", lessonId!)
        .maybeSingle();
      if (error) throw error;
      return (data as LessonQuizRow) || null;
    },
  });
}

/** Member-safe questions (no correct_index) via the SECURITY DEFINER RPC. */
export function useQuizQuestions(quizId: string | undefined) {
  return useQuery({
    queryKey: ["quiz-questions", quizId],
    enabled: !!quizId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_quiz_questions", { p_quiz_id: quizId }); // cast: awaiting types regen (rpc get_quiz_questions)
      if (error) throw error;
      return ((data || []) as any[]).map((q) => ({
        id: q.id as string,
        question: q.question as string,
        options: (Array.isArray(q.options) ? q.options : []) as string[],
      }));
    },
  });
}

/** Creator-only: full questions INCLUDING correct_index (direct table read under the creator RLS policy). */
export function useQuizQuestionsForOwner(quizId: string | undefined) {
  return useQuery({
    queryKey: ["quiz-questions-owner", quizId],
    enabled: !!quizId,
    queryFn: async (): Promise<QuizQuestionDraft[]> => {
      const { data, error } = await (supabase as any) // cast: awaiting types regen (quiz_questions)
        .from("quiz_questions")
        .select("id, question, options, correct_index, position")
        .eq("quiz_id", quizId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data || []) as any[]).map((q) => ({
        id: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correct_index: q.correct_index,
      }));
    },
  });
}

/** The caller's attempts on a quiz, newest first (best score derived client-side). */
export function useMyQuizAttempts(quizId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz-attempts", quizId, user?.id],
    enabled: !!quizId && !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any) // cast: awaiting types regen (quiz_attempts)
        .from("quiz_attempts")
        .select("score_pct, passed, created_at")
        .eq("quiz_id", quizId!)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data || []) as { score_pct: number; passed: boolean; created_at: string }[];
    },
  });
}

/** Creator: upsert the quiz shell and replace its question set atomically-enough for the editor. */
export function useSaveQuiz() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, passPct, questions }: { lessonId: string; passPct: number; questions: QuizQuestionDraft[] }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: quiz, error: quizErr } = await (supabase as any) // cast: awaiting types regen (lesson_quizzes)
        .from("lesson_quizzes")
        .upsert(
          { lesson_id: lessonId, creator_id: user.id, pass_pct: passPct, updated_at: new Date().toISOString() },
          { onConflict: "lesson_id" },
        )
        .select("id")
        .single();
      if (quizErr) throw quizErr;
      const quizId = (quiz as any).id as string;
      // Replace the question set (attempts reference quiz_id, so they survive edits).
      const { error: delErr } = await (supabase as any).from("quiz_questions").delete().eq("quiz_id", quizId); // cast: awaiting types regen (quiz_questions)
      if (delErr) throw delErr;
      if (questions.length > 0) {
        const rows = questions.map((q, i) => ({
          quiz_id: quizId,
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()),
          correct_index: q.correct_index,
          position: i,
        }));
        const { error: insErr } = await (supabase as any).from("quiz_questions").insert(rows); // cast: awaiting types regen (quiz_questions)
        if (insErr) throw insErr;
      }
      return quizId;
    },
    onSuccess: (_quizId, { lessonId }) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-quiz", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-owner"] });
    },
  });
}

/** Creator: remove the quiz entirely (questions + attempts cascade). */
export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quizId }: { quizId: string; lessonId: string }) => {
      const { error } = await (supabase as any).from("lesson_quizzes").delete().eq("id", quizId); // cast: awaiting types regen (lesson_quizzes)
      if (error) throw error;
    },
    onSuccess: (_res, { lessonId }) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-quiz", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions-owner"] });
    },
  });
}

export interface QuizGradeResult {
  score_pct: number;
  passed: boolean;
  total: number;
  correct: number;
  pass_pct: number;
  results: { question_id: string; chosen: number | null; correct: boolean }[];
}

/** Member: submit answers ({question_id: index}) for server-side grading. */
export function useGradeQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quizId, answers }: { quizId: string; answers: Record<string, number> }): Promise<QuizGradeResult> => {
      const { data, error } = await (supabase as any).rpc("grade_quiz_attempt", { // cast: awaiting types regen (rpc grade_quiz_attempt)
        p_quiz_id: quizId,
        p_answers: answers,
      });
      if (error) throw error;
      return data as QuizGradeResult;
    },
    onSuccess: (_res, { quizId }) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts", quizId] });
    },
  });
}

/* ── Resume position ── */

const RESUME_MIN_SECONDS = 10; // don't bother resuming inside the first few seconds
const RESUME_TAIL_SECONDS = 10; // ...or right at the end
const SAVE_INTERVAL_MS = 10_000;

/**
 * Saved playback position for a lesson + a video-element binder that
 * (a) seeks to the saved position once metadata is available and
 * (b) writes position_seconds back, throttled to ~10s, plus a final write
 * when the element detaches (lesson switch / unmount).
 * YouTube/Vimeo iframes never produce a video element, so they are naturally
 * skipped — only Mux/HLS/direct <video> playback participates.
 */
export function useResumePosition(lessonId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const seededForRef = useRef<string | null>(null);

  const { data: savedSeconds = 0, isFetched } = useQuery({
    queryKey: ["lesson-resume", lessonId, user?.id],
    enabled: !!lessonId && !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any) // cast: awaiting types regen (lesson_progress)
        .from("lesson_progress")
        .select("position_seconds")
        .eq("lesson_id", lessonId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.position_seconds as number) || 0;
    },
  });

  const write = useCallback(
    async (seconds: number) => {
      if (!user || !lessonId || !(seconds > 0)) return;
      await (supabase as any) // cast: awaiting types regen (lesson_progress)
        .from("lesson_progress")
        .upsert(
          { lesson_id: lessonId, user_id: user.id, position_seconds: Math.floor(seconds), updated_at: new Date().toISOString() },
          { onConflict: "lesson_id,user_id" },
        );
    },
    [user, lessonId],
  );

  // Throttled writer + final flush on detach.
  useEffect(() => {
    if (!videoEl || !user || !lessonId) return;
    let lastWrite = Date.now();
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastWrite >= SAVE_INTERVAL_MS && videoEl.currentTime > 0) {
        lastWrite = now;
        write(videoEl.currentTime).then(() =>
          queryClient.setQueryData(["lesson-resume", lessonId, user.id], Math.floor(videoEl.currentTime)),
        );
      }
    };
    videoEl.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      videoEl.removeEventListener("timeupdate", onTimeUpdate);
      if (videoEl.currentTime > 0) void write(videoEl.currentTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoEl, lessonId, user?.id, write]);

  // One-time seek to the saved position per lesson open (wait for the saved
  // position to load so we never mark a lesson "seeded" with a stale 0).
  useEffect(() => {
    if (!videoEl || !lessonId || !isFetched || seededForRef.current === lessonId) return;
    if (savedSeconds > RESUME_MIN_SECONDS) {
      const seek = () => {
        try {
          if (!videoEl.duration || savedSeconds < videoEl.duration - RESUME_TAIL_SECONDS) {
            videoEl.currentTime = savedSeconds;
          }
        } catch {
          /* seeking an unready element is harmless */
        }
      };
      if (videoEl.readyState >= 1) seek();
      else videoEl.addEventListener("loadedmetadata", seek, { once: true });
    }
    seededForRef.current = lessonId;
  }, [videoEl, savedSeconds, lessonId, isFetched]);

  // Reset the seed marker when switching lessons so each open seeks once.
  useEffect(() => {
    if (seededForRef.current !== lessonId) seededForRef.current = null;
  }, [lessonId]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (videoEl) {
        try {
          videoEl.currentTime = seconds;
          void videoEl.play().catch(() => {});
        } catch {
          /* noop */
        }
      }
    },
    [videoEl],
  );

  return { savedSeconds, bindVideo: setVideoEl, seekTo, hasVideoEl: !!videoEl };
}

export function formatResumeTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Certificate data ── */

export interface CertificateData {
  studentName: string;
  courseName: string;
  creatorName: string;
  completedAt: string; // ISO
}

/**
 * Names + completion date for the course-completion certificate. Only queried
 * once the client already knows every lesson is complete.
 */
export function useCertificateData(creatorId: string | undefined, lessonIds: string[], enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["certificate-data", creatorId, user?.id, lessonIds.length],
    enabled: !!creatorId && !!user && enabled && lessonIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<CertificateData> => {
      const [me, space, creator, latest] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user!.id).maybeSingle(),
        supabase.from("creator_spaces").select("name").eq("creator_id", creatorId!).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("user_id", creatorId!).maybeSingle(),
        supabase
          .from("lesson_completions")
          .select("completed_at")
          .eq("user_id", user!.id)
          .in("lesson_id", lessonIds)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        studentName: me.data?.display_name || user!.email?.split("@")[0] || "Student",
        courseName: space.data?.name || "Course",
        creatorName: creator.data?.display_name || "Creator",
        completedAt: latest.data?.completed_at || new Date().toISOString(),
      };
    },
  });
}
