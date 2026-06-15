import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useState, useCallback } from "react";

export type PeopleFilter = "everyone" | "women_local" | "men_local" | "by_event";

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
  shared_event_id?: string | null;
  shared_global_event_id?: string | null;
  shared_interests_count?: number;
  upcoming_event_titles?: string[];
}

export function usePeopleSwipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PeopleFilter>("everyone");
  const [filterEventId, setFilterEventId] = useState<string | null>(null);
  const [filterGlobalEventId, setFilterGlobalEventId] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["people-swipe", user?.id, filter, filterEventId, filterGlobalEventId],
    queryFn: async () => {
      if (!user) return [];

      // Get IDs already hey'd
      const { data: sentHeys } = await (supabase as any)
        .from("heys")
        .select("recipient_id")
        .eq("sender_id", user.id);
      const heyedIds = new Set((sentHeys || []).map((h: any) => h.recipient_id));

      // Current user's attendance — for shared event detection
      const { data: myAttendance } = await (supabase as any)
        .from("attendance")
        .select("event_id, global_event_id, event_title, events:event_id(title)")
        .eq("user_id", user.id)
        .eq("status", "going");

      const myEventIds = new Set(
        (myAttendance || []).map((a: any) => a.event_id).filter(Boolean)
      );
      const myGlobalEventIds = new Set(
        (myAttendance || []).map((a: any) => a.global_event_id).filter(Boolean)
      );
      const eventTitleMap = new Map<string, string>();
      (myAttendance || []).forEach((a: any) => {
        if (a.event_id && a.events?.title) eventTitleMap.set(a.event_id, a.events.title);
        if (a.global_event_id && a.event_title) eventTitleMap.set(a.global_event_id, a.event_title);
      });

      // Build profile query (gender column not present yet — filter is a no-op for women_local/men_local)
      const profileQuery = (supabase as any)
        .from("profiles")
        .select(
          "user_id, display_name, avatar_url, age, location, interests, username, people_photos, show_in_people"
        )
        .eq("show_in_people", true)
        .neq("user_id", user.id)
        .limit(150);

      const { data: profiles } = await profileQuery;
      if (!profiles) return [];

      let filtered = profiles.filter((p: any) => !heyedIds.has(p.user_id));

      // "By event" filter — only people attending the same event
      let attendeeIds: Set<string> | null = null;
      if (filter === "by_event" && (filterEventId || filterGlobalEventId)) {
        const attQuery = (supabase as any)
          .from("attendance")
          .select("user_id")
          .eq("status", "going");
        const { data: attendees } = filterEventId
          ? await attQuery.eq("event_id", filterEventId)
          : await attQuery.eq("global_event_id", filterGlobalEventId);
        attendeeIds = new Set((attendees || []).map((a: any) => a.user_id));
        filtered = filtered.filter((p: any) => attendeeIds!.has(p.user_id));
      }

      // Fetch attendance for each filtered profile in one batch to compute shared events
      const profileIds = filtered.map((p: any) => p.user_id);
      const attendanceByUser = new Map<string, any[]>();
      if (profileIds.length > 0) {
        const { data: theirAttendance } = await (supabase as any)
          .from("attendance")
          .select("user_id, event_id, global_event_id, event_title, events:event_id(title)")
          .in("user_id", profileIds)
          .eq("status", "going");
        (theirAttendance || []).forEach((a: any) => {
          const list = attendanceByUser.get(a.user_id) || [];
          list.push(a);
          attendanceByUser.set(a.user_id, list);
        });
      }

      const myInterests = new Set<string>();
      const { data: myProfile } = await (supabase as any)
        .from("profiles")
        .select("interests")
        .eq("user_id", user.id)
        .maybeSingle();
      ((myProfile?.interests as string[]) || []).forEach((i) => myInterests.add(i.toLowerCase()));

      return filtered.map((p: any) => {
        const theirAtt = attendanceByUser.get(p.user_id) || [];
        let shared_event: string | null = null;
        let shared_event_id: string | null = null;
        let shared_global_event_id: string | null = null;

        for (const a of theirAtt) {
          if (a.event_id && myEventIds.has(a.event_id)) {
            shared_event = a.events?.title || eventTitleMap.get(a.event_id) || "an event";
            shared_event_id = a.event_id;
            break;
          }
          if (a.global_event_id && myGlobalEventIds.has(a.global_event_id)) {
            shared_event = a.event_title || eventTitleMap.get(a.global_event_id) || "an event";
            shared_global_event_id = a.global_event_id;
            break;
          }
        }

        const upcoming_event_titles = theirAtt
          .map((a: any) => a.events?.title || a.event_title)
          .filter(Boolean)
          .slice(0, 3);

        const interests = (p.interests || []) as string[];
        const shared_interests_count = interests.filter((i) =>
          myInterests.has(i.toLowerCase())
        ).length;

        return {
          user_id: p.user_id,
          display_name: p.display_name || "User",
          avatar_url: p.avatar_url,
          age: p.age,
          location: p.location,
          interests,
          username: p.username,
          people_photos: p.people_photos || [],
          shared_event,
          shared_event_id,
          shared_global_event_id,
          shared_interests_count,
          upcoming_event_titles,
        } as PersonCard;
      });
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
    filter,
    setFilter,
    filterEventId,
    setFilterEventId,
    filterGlobalEventId,
    setFilterGlobalEventId,
  };
}
