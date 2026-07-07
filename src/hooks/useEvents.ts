import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { tables } from "@/lib/supabaseTyped";

export type EventRow = {
  id: string;
  creator_id: string;
  space_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  location_state: string | null;
  cover_image_url: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  ticket_price: number;
  is_free: boolean;
  ticket_quantity: number | null;
  tickets_sold: number;
  is_sold_out: boolean;
  virtual_link: string | null;
  virtual_link_unlocked_at: string | null;
  stream_on_uply: boolean;
  mux_stream_id: string | null;
  stripe_price_id: string | null;
  status: string;
  refund_policy: string;
  slug: string | null;
  created_at: string;
};

export type TicketRow = {
  id: string;
  event_id: string;
  buyer_id: string;
  creator_id: string;
  stripe_payment_intent_id: string | null;
  amount_paid: number;
  platform_fee: number;
  creator_earnings: number;
  qr_code_token: string;
  qr_code_secret: string | null;
  qr_code_url: string | null;
  status: string;
  ticket_number: string | null;
  checked_in_at: string | null;
  scanned_at: string | null;
  created_at: string;
};

export function useCreatorEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["creator-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await tables.events()
        .select("*")
        .eq("creator_id", user!.id)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EventRow[];
    },
  });
}

export function usePublishedEvents(filter?: string) {
  return useQuery({
    queryKey: ["published-events", filter],
    queryFn: async () => {
      let q = tables.events()
        .select("*")
        .eq("status", "published")
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true });

      if (filter === "virtual") q = q.eq("event_type", "virtual");
      else if (filter === "in_person") q = q.eq("event_type", "in_person");
      else if (filter === "free") q = q.eq("is_free", true);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EventRow[];
    },
  });
}

export function useEvent(slugOrId?: string) {
  return useQuery({
    queryKey: ["event", slugOrId],
    enabled: !!slugOrId,
    queryFn: async () => {
      let { data, error } = await tables.events()
        .select("*")
        .eq("slug", slugOrId)
        .maybeSingle();
      if (!data) {
        ({ data, error } = await tables.events()
          .select("*")
          .eq("id", slugOrId)
          .maybeSingle());
      }
      if (error) throw error;
      return data as EventRow | null;
    },
  });
}

export function useEventTickets(eventId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["event-tickets", eventId, user?.id],
    enabled: !!eventId && !!user,
    queryFn: async () => {
      const { data, error } = await tables.tickets()
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data || []) as TicketRow[];
    },
  });
}

export function useMyTickets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await tables.tickets()
        .select("*, events:event_id(*)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useMyTicketForEvent(eventId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-ticket", eventId, user?.id],
    enabled: !!eventId && !!user,
    queryFn: async () => {
      const { data, error } = await tables.tickets()
        .select("*")
        .eq("event_id", eventId)
        .eq("buyer_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data as TicketRow | null;
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: Partial<EventRow>) => {
      const { data, error } = await tables.events()
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data as EventRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator-events"] });
      toast.success("Event created!");
    },
    onError: (e: Error) => {
      toast.error("Error creating event", { description: e.message });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EventRow> & { id: string }) => {
      const { data, error } = await tables.events()
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EventRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creator-events"] });
      qc.invalidateQueries({ queryKey: ["event"] });
      qc.invalidateQueries({ queryKey: ["published-events"] });
    },
    onError: (e: Error) => {
      toast.error("Error updating event", { description: e.message });
    },
  });
}

export function useClaimFreeTicket() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (event: EventRow) => {
      if (!user) throw new Error("Must be logged in");

      // If user already has an active ticket, return it (idempotent RSVP)
      const { data: existing } = await tables.tickets()
        .select("*")
        .eq("event_id", event.id)
        .eq("buyer_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (existing) return existing as TicketRow;

      // Atomic reserve to prevent oversell
      const { data: reserved, error: reserveErr } = await supabase
        .rpc("reserve_event_ticket", { p_event_id: event.id, p_qty: 1 });
      if (reserveErr) throw reserveErr;
      if (!reserved) throw new Error("Sold out");

      const token = crypto.randomUUID();
      const { data, error } = await tables.tickets()
        .insert({
          event_id: event.id,
          buyer_id: user.id,
          creator_id: event.creator_id,
          amount_paid: 0,
          platform_fee: 0,
          creator_earnings: 0,
          qr_code_token: token,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return data as TicketRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ticket"] });
      qc.invalidateQueries({ queryKey: ["event"] });
      toast.success("You're going! 🎉", { description: "Free ticket claimed successfully." });
    },
    onError: (e: any) => {
      const raw = e?.message || e?.error_description || e?.hint || "Unknown error";
      let description = raw;
      if (/sold out/i.test(raw)) description = "This event is sold out.";
      else if (/logged in|JWT|auth/i.test(raw)) description = "Please sign in and try again.";
      else if (/duplicate|unique/i.test(raw)) description = "You already have a ticket for this event.";
      else if (/row-level security|policy/i.test(raw)) description = "Permission denied. Try signing out and back in.";
      else if (/network|fetch/i.test(raw)) description = "Network issue. Check your connection and retry.";
      toast.error("Couldn't RSVP", { description });
    },
  });
}

export function useSetEventReminder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await tables.eventReminders()
        .insert({ event_id: eventId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-reminder"] });
      toast.success("Reminder set! 🔔");
    },
    onError: (e: Error) => {
      if (e.message?.includes("duplicate")) {
        toast.success("Reminder already set");
      } else {
        toast.error("Error", { description: e.message });
      }
    },
  });
}

export function useCreatorEventsByUsername(username?: string) {
  return useQuery({
    queryKey: ["creator-events-public", username],
    enabled: !!username,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .maybeSingle();
      if (!profile) return [];

      const { data, error } = await tables.events()
        .select("*")
        .eq("creator_id", profile.user_id)
        .eq("status", "published")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data || []) as EventRow[];
    },
  });
}

export function useCheckInTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { qrSecret: string; eventId?: string }) => {
      const { data, error } = await supabase.functions.invoke("scan-ticket", {
        body: { qr_secret: input.qrSecret, event_id: input.eventId },
      });
      if (error) throw new Error(error.message || "Scan failed");
      if (!data?.valid) {
        if (data?.reason?.toLowerCase().includes("already")) {
          throw new Error("ALREADY_USED:" + (data.scanned_at || ""));
        }
        throw new Error(data?.reason || "INVALID");
      }
      return data as { valid: true; ticket_id: string; buyer_id?: string; event_title: string; scanned_at: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-tickets"] });
    },
  });
}
