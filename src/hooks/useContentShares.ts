import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface ShareCount {
  platform: string;
  count: number;
}

export function useContentShares(contentType: string, contentId: string) {
  const { user } = useAuth();
  const [totalShares, setTotalShares] = useState(0);
  const [platformBreakdown, setPlatformBreakdown] = useState<ShareCount[]>([]);

  const fetchShares = useCallback(async () => {
    if (!contentId) return;
    const { data } = await supabase
      .from("content_shares")
      .select("platform")
      .eq("content_type", contentType)
      .eq("content_id", contentId);

    if (data) {
      setTotalShares(data.length);
      const counts = new Map<string, number>();
      data.forEach((s) => {
        counts.set(s.platform, (counts.get(s.platform) || 0) + 1);
      });
      setPlatformBreakdown(
        Array.from(counts.entries()).map(([platform, count]) => ({ platform, count }))
      );
    }
  }, [contentType, contentId]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  // Realtime subscription
  useEffect(() => {
    if (!contentId) return;
    const channel = supabase
      .channel(`shares-${contentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "content_shares",
          filter: `content_id=eq.${contentId}`,
        },
        () => fetchShares()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, fetchShares]);

  const trackShare = useCallback(
    async (platform: string) => {
      if (!user || !contentId) return;
      await supabase.from("content_shares").insert({
        content_type: contentType,
        content_id: contentId,
        platform,
        shared_by_user_id: user.id,
      });
    },
    [user, contentType, contentId]
  );

  return { totalShares, platformBreakdown, trackShare, refetch: fetchShares };
}
