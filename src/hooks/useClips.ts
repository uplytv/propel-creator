import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { fetchProfileMap } from "@/lib/supabaseTyped";

export interface Clip {
  id: string;
  caption: string;
  clip_asset_id: string | null;
  clip_playback_id: string | null;
  clipped_by_user_id: string;
  creator_id: string;
  duration_seconds: number;
  source_type: string;
  source_asset_id: string | null;
  is_public: boolean;
  view_count: number;
  created_at: string;
  // joined
  creator_name?: string;
  creator_avatar?: string;
}

export function useClips(options?: { creatorId?: string; publicOnly?: boolean; limit?: number }) {
  const { user } = useAuth();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClips = async () => {
    let query = supabase
      .from("clips")
      .select("*")
      .order("created_at", { ascending: false });

    if (options?.creatorId) {
      query = query.eq("creator_id", options.creatorId);
    }
    if (options?.publicOnly) {
      query = query.eq("is_public", true);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data } = await query;
    if (data) {
      const creatorIds = [...new Set(data.map((c) => c.creator_id))];
      const profileMap = await fetchProfileMap(creatorIds);

      setClips(
        data.map((c) => ({
          ...c,
          creator_name: profileMap.get(c.creator_id)?.display_name || "Creator",
          creator_avatar: profileMap.get(c.creator_id)?.avatar_url || null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClips();
  }, [options?.creatorId]);

  const deleteClip = async (id: string) => {
    await supabase.from("clips").delete().eq("id", id);
    fetchClips();
  };

  return { clips, loading, refetch: fetchClips, deleteClip };
}
