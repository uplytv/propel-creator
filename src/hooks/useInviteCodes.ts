import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";

export interface InviteCode {
  id: string;
  code: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  used_by_name?: string;
  used_by_avatar?: string;
}

export interface InviteCodeData {
  codes: InviteCode[];
  remaining: number;
  used: number;
}

export function useInviteCodes() {
  const { user } = useAuth();
  const { profile } = useApp();

  return useQuery({
    queryKey: ["invite-codes", user?.id],
    enabled: !!user && profile.isApproved,
    staleTime: 60_000,
    queryFn: async (): Promise<InviteCodeData> => {
      const { data: codes, error } = await supabase
        .from("invite_codes")
        .select("id, code, is_used, used_by, used_at")
        .eq("owner_id", user!.id)
        .order("created_at");

      if (error) throw error;
      if (!codes) return { codes: [], remaining: 0, used: 0 };

      const enriched: InviteCode[] = await Promise.all(
        (codes as any[]).map(async (c) => {
          if (c.used_by) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("user_id", c.used_by)
              .single();
            return {
              ...c,
              used_by_name: (prof as any)?.display_name || "Someone",
              used_by_avatar: (prof as any)?.avatar_url || null,
            };
          }
          return c as InviteCode;
        })
      );

      return {
        codes: enriched,
        remaining: enriched.filter((c) => !c.is_used).length,
        used: enriched.filter((c) => c.is_used).length,
      };
    },
  });
}

export function getInviteUrl(code: string): string {
  return `https://uply.tv/invite/${code}`;
}
