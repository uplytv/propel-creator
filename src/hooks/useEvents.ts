import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
  qr_code_url: string | null;
  status: string;
  checked_in_at: string | null;
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
  const { toast } = useToast();
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
      toast({ title: "Event created!" });
    },
    onError: (e: Error) => {
      toast({ title: "Error creating event", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  const { toast } = useToast();
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
      toast({ title: "Error updating event", description: e.message, variant: "destructive" });
    },
  });
}

export function useClaimFreeTicket() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (event: EventRow) => {
      if (!user) throw new Error("Must be logged in");
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

      await tables.events()
        .update({ tickets_sold: event.tickets_sold + 1 })
        .eq("id", event.id);

      return data as TicketRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ticket"] });
      qc.invalidateQueries({ queryKey: ["event"] });
      toast({ title: "You're going! 🎉", description: "Free ticket claimed successfully." });
    },
    onError: (e: Error) => {
      toast({ title: "Error claiming ticket", description: e.message, variant: "destructive" });
    },
  });
}

export function useSetEventReminder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await tables.eventReminders()
        .insert({ event_id: eventId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-reminder"] });
      toast({ title: "Reminder set! 🔔" });
    },
    onError: (e: Error) => {
      if (e.message?.includes("duplicate")) {
        toast({ title: "Reminder already set" });
      } else {
        toast({ title: "Error", description: e.message, variant: "destructive" });
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
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (qrToken: string) => {
      const { data, error } = await tables.tickets()
        .select("*, events:event_id(title)")
        .eq("qr_code_token", qrToken)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("INVALID");
      if (data.status === "used") throw new Error("ALREADY_USED:" + data.checked_in_at);
      if (data.status !== "active") throw new Error("INVALID_STATUS:" + data.status);

      await tables.tickets()
        .update({ status: "used", checked_in_at: new Date().toISOString() })
        .eq("id", data.id);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event-tickets"] });
    },
  });
}
