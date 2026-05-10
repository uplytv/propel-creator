import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useGigListings(filters?: { gigType?: string; city?: string }) {
  return useQuery({
    queryKey: ["music-gig-listings", filters],
    queryFn: async () => {
      let q = supabase.from("music_gig_listings").select("*").eq("is_active", true);
      if (filters?.gigType) q = q.eq("gig_type", filters.gigType);
      if (filters?.city) q = q.ilike("home_city", `%${filters.city}%`);
      const { data, error } = await q.order("booking_count", { ascending: false }).limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGigListing(id?: string) {
  return useQuery({
    queryKey: ["music-gig-listing", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_gig_listings")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyGigListings() {
  return useQuery({
    queryKey: ["my-music-gig-listings"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("music_gig_listings")
        .select("*")
        .eq("artist_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertGigListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const payload = { ...input, artist_id: auth.user.id };
      const { data, error } = await supabase
        .from("music_gig_listings")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-gig-listings"] });
      qc.invalidateQueries({ queryKey: ["my-music-gig-listings"] });
    },
  });
}

export function useMyBookingInquiries(role: "booker" | "artist") {
  return useQuery({
    queryKey: ["my-music-booking-inquiries", role],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("music_booking_inquiries")
        .select("*, music_gig_listings(title, artwork_url)")
        .eq(role === "booker" ? "booker_id" : "artist_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBookingInquiry(id?: string) {
  return useQuery({
    queryKey: ["music-booking-inquiry", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_booking_inquiries")
        .select("*, music_gig_listings(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useBookingMessages(inquiryId?: string) {
  return useQuery({
    queryKey: ["music-booking-messages", inquiryId],
    enabled: !!inquiryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_booking_messages")
        .select("*")
        .eq("inquiry_id", inquiryId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateBookingInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      listing_id: string;
      artist_id: string;
      event_title?: string;
      event_date?: string;
      event_location?: string;
      duration_minutes?: number;
      budget_cents?: number;
      message?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_booking_inquiries")
        .insert({ ...input, booker_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-music-booking-inquiries"] }),
  });
}

export function useUpdateBookingInquiryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("music_booking_inquiries")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["music-booking-inquiry", d.id] });
      qc.invalidateQueries({ queryKey: ["my-music-booking-inquiries"] });
    },
  });
}

export function useSendBookingMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inquiry_id, body }: { inquiry_id: string; body: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_booking_messages")
        .insert({ inquiry_id, sender_id: auth.user.id, body })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["music-booking-messages", d.inquiry_id] }),
  });
}
