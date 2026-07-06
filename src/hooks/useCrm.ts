import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { CrmActivityKind, CrmContact, CrmActivity, CrmStage } from "@/components/crm/crmTypes";

// NOTE: crm_contacts / crm_activities / crm_sync_contacts are new —
// (supabase as any) casts stay until types.ts is regenerated.
const db = supabase as any;

export function useCrmContacts() {
  const { user } = useAuth();
  return useQuery<CrmContact[]>({
    queryKey: ["crm-contacts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("crm_contacts")
        .select("*")
        .eq("creator_id", user!.id)
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as CrmContact[];
    },
  });
}

export function useSyncCrmContacts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("crm_sync_contacts", { p_creator_id: user!.id });
      if (error) throw error;
      return (data ?? 0) as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["crm-contacts"] });
      toast.success(count > 0 ? `Synced ${count} contact${count === 1 ? "" : "s"}` : "Contacts are up to date");
    },
    onError: () => toast.error("Sync failed — try again"),
  });
}

export function useUpdateContactStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, stage }: { contactId: string; stage: CrmStage }) => {
      const { error } = await db.from("crm_contacts").update({ stage }).eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-contacts"] }),
    onError: () => toast.error("Couldn't update stage"),
  });
}

export function useCrmActivities(contactId: string | null) {
  return useQuery<CrmActivity[]>({
    queryKey: ["crm-activities", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await db
        .from("crm_activities")
        .select("*")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmActivity[];
    },
  });
}

export function useAddCrmActivity() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contactId: string; kind: CrmActivityKind; body: string; dueAt?: string | null }) => {
      const { error } = await db.from("crm_activities").insert({
        contact_id: input.contactId,
        creator_id: user!.id,
        kind: input.kind,
        body: input.body,
        due_at: input.dueAt ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-activities", vars.contactId] });
      qc.invalidateQueries({ queryKey: ["crm-contacts"] }); // notes_count / last_activity_at changed
      toast.success("Added");
    },
    onError: () => toast.error("Couldn't add activity"),
  });
}

export function useToggleTaskDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ activityId, done }: { activityId: string; contactId: string; done: boolean }) => {
      const { error } = await db.from("crm_activities").update({ done }).eq("id", activityId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-activities", vars.contactId] });
    },
    onError: () => toast.error("Couldn't update task"),
  });
}
