import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

/**
 * Universal access check hook.
 * Queries access_grants for the current user + resource.
 * Subscribes to Supabase Realtime so post-payment unlocks are instant.
 */
export function useAccess(resourceType: string, resourceId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["access", resourceType, resourceId, user?.id];

  const { data: grant, isLoading, refetch } = useQuery({
    queryKey,
    enabled: !!user && !!resourceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("access_grants")
        .select("id, access_level, granted_at, expires_at")
        .eq("user_id", user!.id)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId!)
        .is("revoked_at", null)
        .maybeSingle();

      // If has expiry, check it
      if (data?.expires_at && new Date(data.expires_at) < new Date()) {
        return null;
      }
      return data;
    },
  });

  // Realtime subscription — refetch when a new grant appears
  useEffect(() => {
    if (!user || !resourceId) return;

    const channel = supabase
      .channel(`access-${resourceType}-${resourceId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "access_grants",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, resourceType, resourceId, refetch]);

  return {
    hasAccess: !!grant,
    accessLevel: grant?.access_level || null,
    isLoading: !user ? false : isLoading,
    grant,
    refetch,
  };
}
