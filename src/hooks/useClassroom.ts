import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Sentry } from "@/lib/sentry";

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
    mutationFn: async ({ title, description, creatorId, is_free }: { title: string; description: string; creatorId: string; is_free?: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("classroom_modules")
        .select("position")
        .eq("creator_id", creatorId)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = existing && (existing as any[]).length > 0 ? (existing as any[])[0].position + 1 : 0;
      const { data, error } = await supabase
        .from("classroom_modules")
        .insert({ creator_id: creatorId, title, description, position: nextPos, is_free: is_free ?? true })
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

export function useCreateLesson() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lesson: { module_id: string; creator_id: string; title: string; description: string; video_url?: string; mux_asset_id?: string; duration_seconds?: number; is_free?: boolean }) => {
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
    mutationFn: async ({ id, title, description }: { id: string; title: string; description: string }) => {
      const { error } = await supabase
        .from("classroom_modules")
        .update({ title, description })
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
    mutationFn: async ({ id, title, description, mux_asset_id, video_url }: { id: string; title: string; description: string; mux_asset_id?: string | null; video_url?: string | null }) => {
      const updateData: any = { title, description };
      if (mux_asset_id !== undefined) updateData.mux_asset_id = mux_asset_id;
      if (video_url !== undefined) updateData.video_url = video_url;
      const { error } = await supabase
        .from("classroom_lessons")
        .update(updateData as any)
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
