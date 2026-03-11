import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useClassroomModules(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["classroom-modules", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classroom_modules" as any)
        .select("*")
        .eq("creator_id", creatorId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useClassroomLessons(moduleIds: string[]) {
  return useQuery({
    queryKey: ["classroom-lessons", moduleIds],
    enabled: moduleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classroom_lessons" as any)
        .select("*")
        .in("module_id", moduleIds)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
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
        .from("classroom_lessons" as any)
        .select("id")
        .eq("creator_id", creatorId!);
      const lessonIds = (lessons || []).map((l: any) => l.id);
      if (lessonIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("lesson_completions" as any)
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
        .from("lesson_completions" as any)
        .insert({ lesson_id: lessonId, user_id: user.id } as any);
      if (error && !error.message.includes("duplicate")) throw error;
      await supabase.from("member_points" as any).insert({
        user_id: user.id, creator_id: creatorId, action_type: "lesson_complete", points: 10,
      } as any);
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
    mutationFn: async ({ title, description, creatorId }: { title: string; description: string; creatorId: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("classroom_modules" as any)
        .select("position")
        .eq("creator_id", creatorId)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = existing && (existing as any[]).length > 0 ? (existing as any[])[0].position + 1 : 0;
      const { error } = await supabase
        .from("classroom_modules" as any)
        .insert({ creator_id: creatorId, title, description, position: nextPos } as any);
      if (error) throw error;
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
        .from("classroom_lessons" as any)
        .select("position")
        .eq("module_id", lesson.module_id)
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = existing && (existing as any[]).length > 0 ? (existing as any[])[0].position + 1 : 0;
      const { error } = await supabase
        .from("classroom_lessons" as any)
        .insert({ ...lesson, position: nextPos } as any);
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
        .from("classroom_modules" as any)
        .update({ title, description } as any)
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
    mutationFn: async ({ id, title, description }: { id: string; title: string; description: string }) => {
      const { error } = await supabase
        .from("classroom_lessons" as any)
        .update({ title, description } as any)
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
        supabase.from("classroom_modules" as any).update({ position: m.position } as any).eq("id", m.id)
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
        supabase.from("classroom_lessons" as any).update({ position: l.position } as any).eq("id", l.id)
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
      await supabase.from("classroom_lessons" as any).delete().eq("module_id", moduleId);
      const { error } = await supabase.from("classroom_modules" as any).delete().eq("id", moduleId);
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
      const { error } = await supabase.from("classroom_lessons" as any).delete().eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classroom-lessons"] });
    },
  });
}
