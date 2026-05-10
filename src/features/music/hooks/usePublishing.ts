import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublishingRegistration = {
  id: string;
  owner_id: string;
  track_id: string | null;
  release_id: string | null;
  isrc: string | null;
  upc: string | null;
  iswc: string | null;
  pro_name: string | null;
  pro_member_id: string | null;
  publisher_name: string | null;
  publisher_share: number | null;
  writer_share: number | null;
  status: string;
  notes: string | null;
  registered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProWork = {
  id: string;
  registration_id: string;
  work_title: string;
  work_id_external: string | null;
  pro_name: string;
  status: string;
  submitted_at: string;
  confirmed_at: string | null;
  notes: string | null;
};

export function useMyPublishingRegistrations() {
  return useQuery({
    queryKey: ["publishing-registrations"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("music_publishing_registrations")
        .select("*")
        .eq("owner_id", u.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PublishingRegistration[];
    },
  });
}

export function useRegistrationWorks(registrationId: string | undefined) {
  return useQuery({
    queryKey: ["pro-works", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_pro_works")
        .select("*")
        .eq("registration_id", registrationId!)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as ProWork[];
    },
  });
}

export function useUpsertRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PublishingRegistration> & { id?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload = { ...input, owner_id: u.user.id };
      const { data, error } = await supabase
        .from("music_publishing_registrations")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as PublishingRegistration;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publishing-registrations"] }),
  });
}

export function useAddProWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { registration_id: string; work_title: string; pro_name: string; work_id_external?: string }) => {
      const { data, error } = await supabase
        .from("music_pro_works")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as ProWork;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["pro-works", v.registration_id] }),
  });
}
