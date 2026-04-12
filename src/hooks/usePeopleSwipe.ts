import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useState, useCallback } from "react";

export interface PersonCard {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  age: number | null;
  location: string | null;
  interests: string[];
  username: string | null;
  people_photos: string[];
  shared_event?: string | null;
}

export function usePeopleSwipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["people-swipe", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get IDs already hey'd
      const { data: sentHeys } = await (supabase as any)
        .from("heys")
        .select("recipient_id")
        .eq("sender_id", user.id);
      const heyedIds = new Set((sentHeys || []).map((h: any) => h.recipient_id));

      // Get profiles
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("user_id, display_name, avatar_url, age, location, interests, username, people_photos, show_in_people")
        .eq("show_in_people", true)
        .neq("user_id", user.id)
        .limit(100);

      if (!profiles) return [];

      // Filter out already hey'd
      const filtered = profiles.filter((p: any) => !heyedIds.has(p.user_id));

      return filtered.map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || "User",
        avatar_url: p.avatar_url,
        age: p.age,
        location: p.location,
        interests: p.interests || [],
        username: p.username,
        people_photos: p.people_photos || [],
        shared_event: null,
      })) as PersonCard[];
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const visibleCards = cards.filter((c) => !dismissedIds.has(c.user_id));

  const dismiss = useCallback((userId: string) => {
    setDismissedIds((prev) => new Set(prev).add(userId));
  }, []);

  const sendHey = useMutation({
    mutationFn: async (recipientId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("heys").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        hey_type: "free",
      });
      if (error) {
        if (error.code === "23505") throw new Error("Already sent Hey");
        throw error;
      }
      // Create notification
      await (supabase as any).from("notifications").insert({
        user_id: recipientId,
        type: "hey",
        title: "Someone Heyed you 👋",
        message: "Open People to see who — Hey back to connect",
        actor_id: user.id,
        read: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heys"] });
    },
  });

  const checkMutual = useCallback(
    async (recipientId: string): Promise<boolean> => {
      if (!user) return false;
      const { data } = await (supabase as any)
        .from("heys")
        .select("id")
        .eq("sender_id", recipientId)
        .eq("recipient_id", user.id)
        .maybeSingle();
      if (data) {
        // Mark both as mutual
        await (supabase as any)
          .from("heys")
          .update({ is_mutual: true })
          .eq("sender_id", recipientId)
          .eq("recipient_id", user.id);
        await (supabase as any)
          .from("heys")
          .update({ is_mutual: true })
          .eq("sender_id", user.id)
          .eq("recipient_id", recipientId);
        // Notify both
        await (supabase as any).from("notifications").insert({
          user_id: recipientId,
          type: "hey_mutual",
          title: "It's a match! 💚",
          message: "You both Heyed each other — start a conversation!",
          actor_id: user.id,
          read: false,
        });
        return true;
      }
      return false;
    },
    [user]
  );

  return {
    cards: visibleCards,
    isLoading,
    dismiss,
    sendHey: sendHey.mutateAsync,
    checkMutual,
  };
}
