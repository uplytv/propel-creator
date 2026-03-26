import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useGrowProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["grow-progress", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("grow_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        user_id: string;
        completed_tasks: string[];
        streak_days: number;
        last_activity_date: string | null;
      } | null;
    },
    enabled: !!user,
  });
}

export function useUpdateGrowProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (completedTasks: string[]) => {
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];

      // Get current progress
      const { data: existing } = await supabase
        .from("grow_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let streakDays = 1;
      if (existing) {
        const lastDate = (existing as any).last_activity_date;
        if (lastDate) {
          const last = new Date(lastDate);
          const now = new Date(today);
          const diffDays = Math.floor(
            (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 0) {
            streakDays = (existing as any).streak_days;
          } else if (diffDays === 1) {
            streakDays = (existing as any).streak_days + 1;
          }
          // else reset to 1
        }
      }

      if (existing) {
        const { error } = await supabase
          .from("grow_progress")
          .update({
            completed_tasks: completedTasks,
            streak_days: streakDays,
            last_activity_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grow_progress").insert({
          user_id: user.id,
          completed_tasks: completedTasks,
          streak_days: streakDays,
          last_activity_date: today,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grow-progress", user?.id] });
    },
  });
}
