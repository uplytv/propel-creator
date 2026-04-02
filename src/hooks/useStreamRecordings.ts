import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface StreamRecording {
  id: string;
  title: string;
  description: string;
  duration_seconds: number;
  mux_asset_id: string | null;
  playback_id: string | null;
  creator_id: string;
  is_published: boolean;
  is_free: boolean;
  view_count: number;
  created_at: string;
}

export function useStreamRecordings(creatorId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetId = creatorId || user?.id;
  const isPublicView = !!(creatorId && creatorId !== user?.id);

  const query = useQuery({
    queryKey: ["stream-recordings", targetId, isPublicView],
    enabled: !!targetId,
    queryFn: async () => {
      let q = supabase
        .from("stream_recordings")
        .select("*")
        .eq("creator_id", targetId!)
        .order("created_at", { ascending: false });

      if (isPublicView) {
        q = q.eq("is_published", true);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data as StreamRecording[]) || [];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["stream-recordings", targetId, isPublicView] });

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("stream_recordings").update({ is_published: !current }).eq("id", id);
    invalidate();
  };

  const deleteRecording = async (id: string) => {
    await supabase.from("stream_recordings").delete().eq("id", id);
    invalidate();
  };

  return {
    recordings: query.data || [],
    loading: query.isLoading,
    refetch: query.refetch,
    togglePublish,
    deleteRecording,
  };
}
