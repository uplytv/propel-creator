import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Subscriber {
  id: string;
  creator_id: string;
  email: string;
  name: string | null;
  source: string;
  metadata: any;
  tags: string[];
  unsubscribed: boolean;
  unsubscribed_at: string | null;
  total_purchases: number;
  last_seen_at: string | null;
  created_at: string;
}

export function useSubscribers(filters?: { source?: string; search?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscribers", user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("subscribers")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });

      if (filters?.source && filters.source !== "all") {
        query = query.eq("source", filters.source);
      }
      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Subscriber[];
    },
    enabled: !!user,
  });
}

export function useSubscriberStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscriber-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscribers")
        .select("source, unsubscribed")
        .eq("creator_id", user!.id);

      if (error) throw error;
      const all = data || [];
      const active = all.filter(s => !s.unsubscribed);
      const sources: Record<string, number> = {};
      active.forEach(s => { sources[s.source] = (sources[s.source] || 0) + 1; });

      return {
        total: all.length,
        active: active.length,
        unsubscribed: all.length - active.length,
        bySource: sources,
      };
    },
    enabled: !!user,
  });
}

export function useAddSubscriber() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ creatorId, email, name, source, metadata }: {
      creatorId: string;
      email: string;
      name?: string;
      source: string;
      metadata?: any;
    }) => {
      const { error } = await supabase.from("subscribers").upsert(
        { creator_id: creatorId, email, name, source, metadata },
        { onConflict: "creator_id,email" }
      );
      if (error) throw error;

      // Auto-enroll in active drip sequences matching trigger
      const triggerEvent = source === "rsvp" ? "rsvp" : "new_subscriber";
      const { data: sequences } = await supabase
        .from("drip_sequences")
        .select("id")
        .eq("creator_id", creatorId)
        .eq("status", "active")
        .eq("trigger_event", triggerEvent);

      if (sequences?.length) {
        const enrollments = sequences.map(seq => ({
          sequence_id: seq.id,
          subscriber_email: email,
        }));
        await supabase.from("drip_sequence_enrollments")
          .upsert(enrollments, { onConflict: "sequence_id,subscriber_email", ignoreDuplicates: true });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscribers"] });
      qc.invalidateQueries({ queryKey: ["subscriber-stats"] });
    },
  });
}

export function useExportSubscribersCSV() {
  const { user } = useAuth();

  return async () => {
    const { data } = await supabase
      .from("subscribers")
      .select("*")
      .eq("creator_id", user!.id)
      .eq("unsubscribed", false)
      .order("created_at", { ascending: false });

    if (!data?.length) return;

    const headers = ["Email", "Name", "Source", "Date Joined", "Total Purchases", "Last Seen"];
    const rows = data.map(s => [
      s.email,
      s.name || "",
      s.source,
      new Date(s.created_at).toLocaleDateString(),
      s.total_purchases?.toString() || "0",
      s.last_seen_at ? new Date(s.last_seen_at).toLocaleDateString() : "Never",
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
