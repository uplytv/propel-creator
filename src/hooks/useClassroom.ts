import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Sentry } from "@/lib/sentry";

/* ═══════════════════════════════════════════════════════════════════════════
   Lesson video resolution — the reliability layer.

   A lesson can reference video in several ways:
     • YouTube / Vimeo / a direct URL   → embed it as-is
     • A finished Mux upload            → resolved to a playback id
     • An in-flight Mux upload          → still "processing"
     • A failed Mux upload              → "errored" (re-upload)
     • Nothing                          → "none"

   The historical bug: uploads left the lesson at `mux_asset_id = 'pending'`
   and `video_url = 'upload:<id>'` forever — the real ids only ever landed on
   the `mux_assets` row (keyed by upload_id). We now resolve by upload_id and
   self-heal the lesson row (see useSelfHealLessonMedia), so playback is
   permanent after the first successful resolve.
   ═══════════════════════════════════════════════════════════════════════════ */

export type LessonMediaStatus = "ready" | "processing" | "errored" | "none";
export interface LessonMedia {
  status: LessonMediaStatus;
  kind: "youtube" | "vimeo" | "direct" | "mux" | "none";
  playbackId?: string | null;
  youtubeId?: string | null;
  vimeoId?: string | null;
  directUrl?: string | null;
  isHls?: boolean;
  duration?: number | null;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m?.[1] || null;
}

/** The Mux direct-upload id for a lesson, from the column or the legacy `upload:<id>` video_url. */
export function getLessonUploadId(l: any): string | null {
  if (l?.mux_upload_id) return l.mux_upload_id;
  const m = String(l?.video_url || "").match(/^upload:(.+)$/);
  return m?.[1] || null;
}

/** A real Mux asset id on the lesson (ignoring the "pending" sentinel). */
export function getLessonRealAssetId(l: any): string | null {
  const a = l?.mux_asset_id;
  return a && a !== "pending" && a !== "" ? a : null;
}

/**
 * Resolve a lesson to concrete playback info, given the media-source maps from
 * useLessonMediaSources. Pure + synchronous so both the sidebar badge and the
 * player share one source of truth.
 */
export function resolveLessonMedia(
  l: any,
  byUpload: Record<string, any> = {},
  byAsset: Record<string, any> = {},
): LessonMedia {
  // 1. YouTube (explicit type or a YouTube URL)
  const ytId = (l?.video_type === "youtube" && l?.youtube_video_id) || extractYouTubeId(l?.video_url || "");
  if (ytId) return { status: "ready", kind: "youtube", youtubeId: ytId };

  // 2. Playback id already stored on the lesson (self-healed / recording)
  if (l?.mux_playback_id) return { status: "ready", kind: "mux", playbackId: l.mux_playback_id, duration: l.duration_seconds };

  const url = String(l?.video_url || "");

  // 3. An external URL pasted by the creator (not an internal upload sentinel)
  if (url && !url.startsWith("upload:")) {
    const vimeoId = extractVimeoId(url);
    if (vimeoId) return { status: "ready", kind: "vimeo", vimeoId };
    const muxUrl = url.match(/stream\.mux\.com\/([A-Za-z0-9]+)/);
    if (muxUrl) return { status: "ready", kind: "mux", playbackId: muxUrl[1] };
    if (/^https?:\/\//.test(url)) {
      const isHls = url.includes(".m3u8");
      return { status: "ready", kind: "direct", directUrl: url, isHls };
    }
  }

  // 4. A finished/failed/in-flight Mux upload, resolved via the source maps
  const uploadId = getLessonUploadId(l);
  const assetId = getLessonRealAssetId(l);
  const row = (uploadId && byUpload[uploadId]) || (assetId && byAsset[assetId]) || null;
  if (row) {
    if (row.status === "ready" && row.mux_playback_id)
      return { status: "ready", kind: "mux", playbackId: row.mux_playback_id, duration: row.duration };
    if (row.status === "errored" || row.status === "deleted")
      return { status: "errored", kind: "none" };
    return { status: "processing", kind: "none" };
  }

  // A lesson that still points at an upload we couldn't find is processing (or lost).
  if (uploadId || assetId || l?.mux_asset_id === "pending" || l?.video_status === "processing")
    return { status: "processing", kind: "none" };

  return { status: "none", kind: "none" };
}

/**
 * Batch-fetch Mux asset state for a set of lessons, keyed by upload_id and by
 * real asset_id (also covers live-stream recordings). Polls while anything is
 * still processing, then stops.
 */
export function useLessonMediaSources(lessons: any[]) {
  const uploadIds = Array.from(new Set(lessons.map(getLessonUploadId).filter(Boolean))) as string[];
  const assetIds = Array.from(new Set(lessons.map(getLessonRealAssetId).filter(Boolean))) as string[];

  return useQuery({
    queryKey: ["lesson-media-sources", uploadIds.sort(), assetIds.sort()],
    enabled: uploadIds.length + assetIds.length > 0,
    refetchInterval: (query) => {
      const data = query.state.data as { byUpload: Record<string, any> } | undefined;
      if (!data) return false;
      // Keep polling only while something is genuinely still processing — never
      // on an errored asset (which permanently lacks a playback id).
      const anyProcessing = Object.values(data.byUpload).some(
        (a: any) => a.status === "preparing" || a.status === "pending" || a.status === "processing",
      );
      return anyProcessing ? 15000 : false;
    },
    queryFn: async () => {
      const byUpload: Record<string, any> = {};
      const byAsset: Record<string, any> = {};
      if (uploadIds.length > 0) {
        const { data } = await supabase
          .from("mux_assets")
          .select("upload_id, mux_asset_id, status, mux_playback_id, duration")
          .in("upload_id", uploadIds);
        (data || []).forEach((a: any) => { if (a.upload_id) byUpload[a.upload_id] = a; });
      }
      if (assetIds.length > 0) {
        const { data } = await supabase
          .from("mux_assets")
          .select("mux_asset_id, status, mux_playback_id, duration")
          .in("mux_asset_id", assetIds);
        (data || []).forEach((a: any) => { byAsset[a.mux_asset_id] = a; });
        const { data: recs } = await supabase
          .from("stream_recordings")
          .select("mux_asset_id, playback_id, duration_seconds")
          .in("mux_asset_id", assetIds);
        (recs || []).forEach((r: any) => {
          if (!byAsset[r.mux_asset_id])
            byAsset[r.mux_asset_id] = { mux_asset_id: r.mux_asset_id, status: "ready", mux_playback_id: r.playback_id, duration: r.duration_seconds };
        });
      }
      return { byUpload, byAsset };
    },
  });
}

/**
 * Owner-only: once an upload resolves to ready, write the playback id + status
 * + duration back onto the lesson so the reference becomes permanent and the
 * fragile `mux_asset_id = 'pending'` sentinel is retired.
 */
export function useSelfHealLessonMedia(lessons: any[], isOwner: boolean, sources: { byUpload: Record<string, any>; byAsset: Record<string, any> } | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!isOwner || !sources) return;
    const toHeal = lessons.filter((l) => {
      if (l.mux_playback_id) return false; // already stored
      const media = resolveLessonMedia(l, sources.byUpload, sources.byAsset);
      return media.status === "ready" && media.kind === "mux" && !!media.playbackId;
    });
    if (toHeal.length === 0) return;
    (async () => {
      let healed = false;
      for (const l of toHeal) {
        const media = resolveLessonMedia(l, sources.byUpload, sources.byAsset);
        const uploadId = getLessonUploadId(l);
        const row = (uploadId && sources.byUpload[uploadId]) || (getLessonRealAssetId(l) && sources.byAsset[getLessonRealAssetId(l)!]) || null;
        const patch: any = {
          mux_playback_id: media.playbackId,
          video_status: "ready",
        };
        if (row?.mux_asset_id && row.mux_asset_id !== "pending") patch.mux_asset_id = row.mux_asset_id;
        if ((!l.duration_seconds || l.duration_seconds === 0) && row?.duration) patch.duration_seconds = Math.round(row.duration);
        const { error } = await supabase.from("classroom_lessons").update(patch).eq("id", l.id);
        if (!error) healed = true;
      }
      if (healed) queryClient.invalidateQueries({ queryKey: ["classroom-lessons"] });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, sources, lessons.map((l) => `${l.id}:${l.mux_playback_id || ""}`).join(",")]);
}

export function useClassroomModules(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["classroom-modules", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classroom_modules")
        .select("*")
        .eq("creator_id", creatorId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []);
    },
  });
}

export function useClassroomLessons(moduleIds: string[]) {
  return useQuery({
    queryKey: ["classroom-lessons", moduleIds],
    enabled: moduleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classroom_lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []);
    },
  });
}

export function useLessonCompletions(creatorId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lesson-completions", creatorId, user?.id],
    enabled: !!creatorId && !!user,
    queryFn: async () => {
      const { data: lessons } = await supabase
        .from("classroom_lessons")
        .select("id")
        .eq("creator_id", creatorId!);
      const lessonIds = (lessons || []).map((l: any) => l.id);
      if (lessonIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("user_id", user!.id)
        .in("lesson_id", lessonIds);
      if (error) throw error;
      return new Set((data || []).map((d: any) => d.lesson_id));
    },
  });
}

export function useCompleteLesson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, creatorId }: { lessonId: string; creatorId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("lesson_completions")
        .insert({ lesson_id: lessonId, user_id: user.id });
      if (error && !error.message.includes("duplicate")) throw error;
      // Points are awarded server-side by a trigger on lesson_completions INSERT
      // (dedupes via UNIQUE(lesson_id, user_id) — no double-award on re-click).
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-completions"] });
    },
  });
}

export function useCreateModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, description, creatorId, is_free, min_tier_rank, drip_days }: { title: string; description: string; creatorId: string; is_free?: boolean; min_tier_rank?: number | null; drip_days?: number | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("classroom_modules")
        .select("position")
        .eq("creator_id", creatorId)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = existing && (existing as any[]).length > 0 ? (existing as any[])[0].position + 1 : 0;
      const { data, error } = await (supabase as any) // cast: awaiting types regen (classroom_modules.drip_days)
        .from("classroom_modules")
        .insert({ creator_id: creatorId, title, description, position: nextPos, is_free: is_free ?? true, min_tier_rank: min_tier_rank ?? null, drip_days: drip_days ?? null })
        .select()
        .maybeSingle();
      if (error) {
        Sentry.captureException(error, { tags: { context: "classroom" } });
        throw error;
      }
      if (!data) throw new Error("Module was created but could not be retrieved");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-modules"] });
    },
  });
}

export interface LessonWritePayload {
  module_id: string;
  creator_id: string;
  title: string;
  description?: string;
  video_url?: string | null;
  video_type?: string | null;
  youtube_video_id?: string | null;
  mux_asset_id?: string | null;
  mux_upload_id?: string | null;
  mux_playback_id?: string | null;
  video_status?: string | null;
  duration_seconds?: number;
  is_free?: boolean;
  lesson_links?: { label: string; url: string }[];
  /** Minimum subscription tier rank required (null = every member). */
  min_tier_rank?: number | null;
}

export function useCreateLesson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: LessonWritePayload) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("classroom_lessons")
        .select("position")
        .eq("module_id", lesson.module_id)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = existing && (existing as any[]).length > 0 ? (existing as any[])[0].position + 1 : 0;
      const { error } = await supabase
        .from("classroom_lessons")
        .insert({ ...lesson, position: nextPos });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-lessons"] });
    },
  });
}

export function useUpdateModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, description, min_tier_rank, drip_days }: { id: string; title: string; description: string; min_tier_rank?: number | null; drip_days?: number | null }) => {
      const patch: any = { title, description };
      if (min_tier_rank !== undefined) patch.min_tier_rank = min_tier_rank; // new column — only send when provided
      if (drip_days !== undefined) patch.drip_days = drip_days; // new column — only send when provided
      const { error } = await supabase
        .from("classroom_modules")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-modules"] });
    },
  });
}

export function useUpdateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Omit<LessonWritePayload, "module_id" | "creator_id">>) => {
      // Only send keys that were explicitly provided so we never null out
      // untouched columns.
      const updateData: any = {};
      Object.entries(patch).forEach(([k, v]) => { if (v !== undefined) updateData[k] = v; });
      const { error } = await supabase
        .from("classroom_lessons")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-lessons"] });
    },
  });
}

export function useReorderModules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modules: { id: string; position: number }[]) => {
      const promises = modules.map((m) =>
        supabase.from("classroom_modules").update({ position: m.position }).eq("id", m.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-modules"] });
    },
  });
}

export function useReorderLessons() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessons: { id: string; position: number }[]) => {
      const promises = lessons.map((l) =>
        supabase.from("classroom_lessons").update({ position: l.position }).eq("id", l.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-lessons"] });
    },
  });
}

export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moduleId: string) => {
      // Delete lessons in module first
      await supabase.from("classroom_lessons").delete().eq("module_id", moduleId);
      const { error } = await supabase.from("classroom_modules").delete().eq("id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-modules"] });
      queryClient.invalidateQueries({ queryKey: ["classroom-lessons"] });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("classroom_lessons").delete().eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-lessons"] });
    },
  });
}
