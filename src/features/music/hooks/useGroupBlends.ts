import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface GroupBlend {
  id: string;
  owner_id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupBlendMember {
  id: string;
  blend_id: string;
  user_id: string;
  joined_at: string;
}

export function useGroupBlends() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["group-blends", user?.id],
    queryFn: async (): Promise<GroupBlend[]> => {
      if (!user) return [];
      const { data: owned } = await supabase
        .from("group_blends")
        .select("*")
        .eq("owner_id", user.id);
      const { data: memberRows } = await supabase
        .from("group_blend_members")
        .select("blend_id")
        .eq("user_id", user.id);
      const memberIds = (memberRows ?? []).map((r: any) => r.blend_id);
      let memberBlends: any[] = [];
      if (memberIds.length) {
        const { data } = await supabase
          .from("group_blends")
          .select("*")
          .in("id", memberIds);
        memberBlends = data || [];
      }
      const all = [...(owned || []), ...memberBlends];
      const dedup = new Map(all.map((b) => [b.id, b]));
      return Array.from(dedup.values()) as GroupBlend[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Sign in required");
      const { data, error } = await supabase
        .from("group_blends")
        .insert({ owner_id: user.id, name })
        .select()
        .single();
      if (error) throw error;
      // owner is implicit member
      await supabase.from("group_blend_members").insert({ blend_id: data.id, user_id: user.id });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-blends", user?.id] });
      toast({ title: "Blend created" });
    },
  });

  return { ...list, create };
}

export function useGroupBlendMembers(blendId?: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["group-blend-members", blendId],
    queryFn: async (): Promise<GroupBlendMember[]> => {
      if (!blendId) return [];
      const { data, error } = await supabase
        .from("group_blend_members")
        .select("*")
        .eq("blend_id", blendId);
      if (error) throw error;
      return (data ?? []) as GroupBlendMember[];
    },
    enabled: !!blendId,
  });

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!blendId) throw new Error("No blend");
      const { error } = await supabase
        .from("group_blend_members")
        .insert({ blend_id: blendId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-blend-members", blendId] });
      toast({ title: "Member added" });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_blend_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-blend-members", blendId] }),
  });

  return { ...query, addMember, removeMember };
}
