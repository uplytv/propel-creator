import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface NotificationPrefs {
  budget_warning: boolean;
  campaign_completed: boolean;
  weekly_report_email: boolean;
}

const defaults: NotificationPrefs = { budget_warning: true, campaign_completed: true, weekly_report_email: true };

export function useNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["notification_preferences", user?.id];

  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data, error } = await supabase
        .from("notification_preferences" as any)
        .select("budget_warning, campaign_completed, weekly_report_email")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaults;
      return data as unknown as NotificationPrefs;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (prefs: Partial<NotificationPrefs>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notification_preferences" as any)
        .upsert(
          { user_id: user.id, ...prefs } as any,
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onMutate: async (prefs) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<NotificationPrefs>(key);
      qc.setQueryData<NotificationPrefs>(key, (old) => ({ ...(old ?? defaults), ...prefs }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    prefs: query.data ?? defaults,
    isLoading: query.isLoading,
    updatePrefs: mutation.mutateAsync,
  };
}
