import { useState, useEffect } from "react";
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
  const [recordings, setRecordings] = useState<StreamRecording[]>([]);
  const [loading, setLoading] = useState(true);

  const targetId = creatorId || user?.id;

  const fetch = async () => {
    if (!targetId) return;
    const query = supabase
      .from("stream_recordings")
      .select("*")
      .eq("creator_id", targetId)
      .order("created_at", { ascending: false });

    if (creatorId && creatorId !== user?.id) {
      query.eq("is_published", true);
    }

    const { data } = await query;
    setRecordings((data as StreamRecording[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, [targetId]);

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("stream_recordings").update({ is_published: !current }).eq("id", id);
    fetch();
  };

  const deleteRecording = async (id: string) => {
    await supabase.from("stream_recordings").delete().eq("id", id);
    fetch();
  };

  return { recordings, loading, refetch: fetch, togglePublish, deleteRecording };
}
