import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useLatestWeeklyReport() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weekly-report", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_growth_reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useAllWeeklyReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weekly-reports-all", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_growth_reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("week_start", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useMarkReportRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("weekly_growth_reports")
        .update({ read: true })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-report"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-reports-all"] });
    },
  });
}
