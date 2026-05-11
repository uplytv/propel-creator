import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface MusicNotifItem {
  id: string;
  type: "track_uploaded" | "track_reposted" | "track_comment";
  title: string;
  message: string;
  created_at: string;
  link: string;
  actor_id?: string;
  actor_name?: string;
  actor_avatar?: string | null;
}

/**
 * Pulls music-side notifications for the bell:
 *  - track_uploaded / track_reposted from followed users
 *  - new track_comments on tracks the viewer owns
 * Read-only display (no per-row read state in this batch).
 */
export function useMusicActivityNotifications(limit = 15) {
  const { user } = useAuth();

  return useQuery<MusicNotifItem[]>({
    queryKey: ["music-activity-notifs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];

      // 1. Following list
      const { data: followRows } = await supabase
        .from("follows" as any)
        .select("following_id")
        .eq("follower_id", user.id);
      const followingIds = ((followRows ?? []) as any[])
        .map((r) => r.following_id)
        .filter(Boolean);

      // 2. Activity feed events from followed users
      let activity: any[] = [];
      if (followingIds.length) {
        const { data } = await supabase
          .from("activity_feed_events" as any)
          .select("id, actor_id, event_type, target_track_id, created_at, metadata")
          .in("actor_id", followingIds)
          .in("event_type", ["track_uploaded", "track_reposted"])
          .order("created_at", { ascending: false })
          .limit(limit);
        activity = (data ?? []) as any[];
      }

      // 3. Comments on tracks the viewer owns
      const { data: ownedTracks } = await supabase
        .from("tracks" as any)
        .select("id, title")
        .eq("creator_id", user.id);
      const ownedIds = ((ownedTracks ?? []) as any[]).map((t) => t.id);
      const ownedMap = new Map(
        ((ownedTracks ?? []) as any[]).map((t) => [t.id, t.title as string])
      );
      let comments: any[] = [];
      if (ownedIds.length) {
        const { data } = await supabase
          .from("track_comments" as any)
          .select("id, track_id, user_id, content, timestamp_seconds, created_at")
          .in("track_id", ownedIds)
          .neq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(limit);
        comments = (data ?? []) as any[];
      }

      // 4. Resolve actor profiles
      const actorIds = Array.from(
        new Set([
          ...activity.map((a) => a.actor_id),
          ...comments.map((c) => c.user_id),
        ])
      ).filter(Boolean);
      const profileMap = new Map<string, { name: string; avatar: string | null }>();
      if (actorIds.length) {
        const { data: profs } = await supabase
          .from("profiles" as any)
          .select("id, full_name, username, avatar_url")
          .in("id", actorIds);
        for (const p of ((profs ?? []) as any[])) {
          profileMap.set(p.id, {
            name: p.full_name || p.username || "Someone",
            avatar: p.avatar_url ?? null,
          });
        }
      }

      // 5. Resolve target track titles for activity rows
      const trackIds = Array.from(
        new Set(activity.map((a) => a.target_track_id).filter(Boolean))
      );
      const titleMap = new Map<string, string>();
      if (trackIds.length) {
        const { data: trks } = await supabase
          .from("tracks" as any)
          .select("id, title")
          .in("id", trackIds);
        for (const t of ((trks ?? []) as any[])) {
          titleMap.set(t.id, t.title);
        }
      }

      const fmtTs = (s: number | null) => {
        if (s == null) return "";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, "0");
        return `@${m}:${sec}`;
      };

      const items: MusicNotifItem[] = [];

      for (const a of activity) {
        const prof = profileMap.get(a.actor_id);
        const trackTitle = titleMap.get(a.target_track_id) || "a track";
        items.push({
          id: `afe_${a.id}`,
          type: a.event_type,
          title:
            a.event_type === "track_uploaded"
              ? `${prof?.name ?? "Someone"} dropped a new track`
              : `${prof?.name ?? "Someone"} reposted a track`,
          message: trackTitle,
          created_at: a.created_at,
          link: a.target_track_id ? `/music/track/${a.target_track_id}` : "/music/feed",
          actor_id: a.actor_id,
          actor_name: prof?.name,
          actor_avatar: prof?.avatar ?? null,
        });
      }

      for (const c of comments) {
        const prof = profileMap.get(c.user_id);
        const trackTitle = ownedMap.get(c.track_id) || "your track";
        items.push({
          id: `tc_${c.id}`,
          type: "track_comment",
          title: `${prof?.name ?? "Someone"} commented ${fmtTs(c.timestamp_seconds)}`.trim(),
          message: `on ${trackTitle}: ${String(c.content || "").slice(0, 80)}`,
          created_at: c.created_at,
          link: `/music/track/${c.track_id}`,
          actor_id: c.user_id,
          actor_name: prof?.name,
          actor_avatar: prof?.avatar ?? null,
        });
      }

      return items
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    },
    staleTime: 30_000,
  });
}
