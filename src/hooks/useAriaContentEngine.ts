import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function useAriaJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["aria-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aria_content_jobs")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  // Realtime subscription for job updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("aria-jobs-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "aria_content_jobs",
        filter: `creator_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["aria-jobs", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
}

export function useAriaGeneratedContent(jobId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["aria-content", user?.id, jobId],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("aria_generated_content")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (jobId) q = q.eq("job_id", jobId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("aria-content-rt")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "aria_generated_content",
        filter: `creator_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["aria-content", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
}

export function useAriaDistributionSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["aria-settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("aria_distribution_settings")
        .select("*")
        .eq("creator_id", user!.id)
        .maybeSingle();
      return data as any;
    },
  });

  const update = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { data: existing } = await supabase
        .from("aria_distribution_settings")
        .select("id")
        .eq("creator_id", user!.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("aria_distribution_settings").update(updates).eq("creator_id", user!.id);
      } else {
        await supabase.from("aria_distribution_settings").insert({ creator_id: user!.id, ...updates });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aria-settings", user?.id] }),
  });

  return { settings: query.data, isLoading: query.isLoading, updateSettings: update.mutateAsync };
}

export function useStartAriaJob() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceType, sourceId }: { sourceType: string; sourceId: string }) => {
      const { data, error } = await supabase.functions.invoke("aria-process-content", {
        body: { source_type: sourceType, source_id: sourceId, creator_id: user!.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "🤖 ARIA is processing your content", description: "Check Content Studio in a few minutes" });
      queryClient.invalidateQueries({ queryKey: ["aria-jobs", user?.id] });
    },
    onError: (err: any) => {
      toast({ title: "ARIA Error", description: err.message || "Failed to start processing", variant: "destructive" });
    },
  });
}

export function useUpdateContentStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentId, status }: { contentId: string; status: string }) => {
      const updates: any = { status };
      if (status === "published") updates.published_at = new Date().toISOString();
      const { error } = await supabase
        .from("aria_generated_content")
        .update(updates)
        .eq("id", contentId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aria-content", user?.id] }),
  });
}

export function useBulkUpdateContentStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contentIds, status }: { contentIds: string[]; status: string }) => {
      const updates: any = { status };
      if (status === "published") updates.published_at = new Date().toISOString();
      const { error } = await supabase
        .from("aria_generated_content")
        .update(updates)
        .in("id", contentIds);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aria-content", user?.id] }),
  });
}
