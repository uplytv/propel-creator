import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export function usePresave(trackId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["presave", trackId, user?.id],
    queryFn: async () => {
      const [{ count }, mineRes] = await Promise.all([
        supabase.from("track_presaves").select("id", { count: "exact", head: true }).eq("track_id", trackId),
        user
          ? supabase.from("track_presaves").select("id").eq("track_id", trackId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        count: count || 0,
        hasPresaved: !!(mineRes as any)?.data,
      };
    },
    enabled: !!trackId,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to pre-save");
      if (status.data?.hasPresaved) {
        const { error } = await supabase
          .from("track_presaves")
          .delete()
          .eq("track_id", trackId)
          .eq("user_id", user.id);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("track_presaves")
        .insert({ track_id: trackId, user_id: user.id, notify_on_release: true });
      if (error) throw error;
      return true;
    },
    onSuccess: (presaved) => {
      qc.invalidateQueries({ queryKey: ["presave", trackId, user?.id] });
      toast({ title: presaved ? "Pre-saved" : "Pre-save removed" });
    },
    onError: (e: any) => toast({ title: "Could not pre-save", description: e.message, variant: "destructive" }),
  });

  return { ...status.data, isLoading: status.isLoading, toggle: () => toggle.mutate() };
}
