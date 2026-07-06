import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { fetchProfileMap } from "@/lib/supabaseTyped";
import {
  COMMUNITY_POST_TITLE_MAX,
  COMMUNITY_POST_BODY_MAX,
  COMMUNITY_COMMENT_MAX,
} from "@/hooks/useCreatorSpace";

/**
 * Community depth hooks (migration 20260706200000_community_depth.sql):
 * polls, threaded replies, comment likes, post search, member profiles,
 * and calendar-event RSVPs. New tables/columns are not in the generated
 * types yet, hence the (supabase as any) casts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 6;
export const POLL_OPTION_MAX = 100;

// ────────────────────────────────────────────────────────────
// Gap 1 — composer: post with optional image + poll
// ────────────────────────────────────────────────────────────
export function useCreatePostWithExtras() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: {
      creator_id: string;
      title: string;
      body: string;
      category: string;
      image_url?: string | null;
      poll_options?: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");
      if ((post.title?.length ?? 0) > COMMUNITY_POST_TITLE_MAX)
        throw new Error(`Title is too long (max ${COMMUNITY_POST_TITLE_MAX} characters).`);
      if ((post.body?.length ?? 0) > COMMUNITY_POST_BODY_MAX)
        throw new Error(`Post is too long (max ${COMMUNITY_POST_BODY_MAX} characters).`);

      const pollOptions = (post.poll_options || [])
        .map((o) => o.trim().slice(0, POLL_OPTION_MAX))
        .filter(Boolean);
      if (pollOptions.length === 1)
        throw new Error(`Polls need at least ${POLL_MIN_OPTIONS} options.`);
      if (pollOptions.length > POLL_MAX_OPTIONS)
        throw new Error(`Polls can have at most ${POLL_MAX_OPTIONS} options.`);

      const { data: created, error } = await supabase
        .from("community_posts")
        .insert({
          creator_id: post.creator_id,
          author_id: user.id,
          title: post.title,
          body: post.body,
          category: post.category,
          image_url: post.image_url || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Points are awarded server-side by a trigger on community_posts INSERT
      // (see migration 20260706133000_server_side_points.sql).

      if (pollOptions.length >= POLL_MIN_OPTIONS && created?.id) {
        const { error: pollError } = await db
          .from("community_polls")
          .insert({ post_id: created.id, options: pollOptions });
        if (pollError) throw pollError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-polls"] });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Gap 1 — polls: fetch polls + live results for a set of posts
// ────────────────────────────────────────────────────────────
export interface PostPoll {
  id: string;
  post_id: string;
  options: string[];
  counts: number[];
  total: number;
  /** option index the current user voted for, or null */
  myVote: number | null;
}

export function usePostPolls(postIds: string[]) {
  const { user } = useAuth();
  const key = [...postIds].sort();
  return useQuery({
    queryKey: ["community-polls", key],
    enabled: postIds.length > 0,
    queryFn: async (): Promise<Record<string, PostPoll>> => {
      const { data: polls, error } = await db
        .from("community_polls")
        .select("id, post_id, options")
        .in("post_id", postIds);
      if (error) throw error;
      const list = (polls || []) as { id: string; post_id: string; options: string[] }[];
      if (list.length === 0) return {};

      const { data: votes } = await db
        .from("community_poll_votes")
        .select("poll_id, user_id, option_index")
        .in("poll_id", list.map((p) => p.id));

      const result: Record<string, PostPoll> = {};
      for (const poll of list) {
        const options = Array.isArray(poll.options) ? poll.options.map(String) : [];
        const counts = options.map(() => 0);
        let myVote: number | null = null;
        for (const v of (votes || []) as { poll_id: string; user_id: string; option_index: number }[]) {
          if (v.poll_id !== poll.id) continue;
          if (v.option_index >= 0 && v.option_index < counts.length) counts[v.option_index] += 1;
          if (user && v.user_id === user.id) myVote = v.option_index;
        }
        result[poll.post_id] = {
          id: poll.id,
          post_id: poll.post_id,
          options,
          counts,
          total: counts.reduce((a, b) => a + b, 0),
          myVote,
        };
      }
      return result;
    },
  });
}

export function useVotePoll() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; postId: string; optionIndex: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("community_poll_votes")
        .upsert(
          { poll_id: pollId, user_id: user.id, option_index: optionIndex },
          { onConflict: "poll_id,user_id" }
        );
      if (error) throw error;
    },
    // Optimistic: flip the local result bars instantly.
    onMutate: async ({ postId, optionIndex }) => {
      await queryClient.cancelQueries({ queryKey: ["community-polls"] });
      const snapshots = queryClient.getQueriesData<Record<string, PostPoll>>({ queryKey: ["community-polls"] });
      queryClient.setQueriesData<Record<string, PostPoll>>({ queryKey: ["community-polls"] }, (old) => {
        if (!old || !old[postId]) return old;
        const poll = old[postId];
        const counts = [...poll.counts];
        if (poll.myVote !== null && poll.myVote >= 0 && poll.myVote < counts.length) counts[poll.myVote] -= 1;
        if (optionIndex >= 0 && optionIndex < counts.length) counts[optionIndex] += 1;
        return {
          ...old,
          [postId]: { ...poll, counts, total: counts.reduce((a, b) => a + b, 0), myVote: optionIndex },
        };
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshots || []) queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-polls"] });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Gap 2 — threaded replies (one level) + comment likes
// ────────────────────────────────────────────────────────────
export function useCreateReply() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, parentId, body }: { postId: string; parentId: string; body: string; creatorId: string }) => {
      if (!user) throw new Error("Not authenticated");
      if ((body?.length ?? 0) > COMMUNITY_COMMENT_MAX)
        throw new Error(`Comment is too long (max ${COMMUNITY_COMMENT_MAX} characters).`);
      const { error } = await db
        .from("community_comments")
        .insert({ post_id: postId, author_id: user.id, body, parent_id: parentId });
      if (error) throw error;
      // Keep comment_count consistent with useCreateComment (replies are comments).
      const { data: post } = await supabase
        .from("community_posts")
        .select("comment_count")
        .eq("id", postId)
        .single();
      if (post) {
        await supabase
          .from("community_posts")
          .update({ comment_count: (post.comment_count || 0) + 1 })
          .eq("id", postId);
      }
      // Points (+2) awarded server-side by the community_comments INSERT trigger;
      // reply notification by trg_notify_community_reply (20260706200000).
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-comments"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

export interface CommentLikes {
  counts: Record<string, number>;
  mine: Set<string>;
}

export function useCommentLikes(postId: string | undefined, commentIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["comment-likes", postId, [...commentIds].sort()],
    enabled: !!postId && commentIds.length > 0,
    queryFn: async (): Promise<CommentLikes> => {
      const { data, error } = await db
        .from("community_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      for (const row of (data || []) as { comment_id: string; user_id: string }[]) {
        counts[row.comment_id] = (counts[row.comment_id] || 0) + 1;
        if (user && row.user_id === user.id) mine.add(row.comment_id);
      }
      return { counts, mine };
    },
  });
}

export function useToggleCommentLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; postId: string; liked: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (liked) {
        const { error } = await db
          .from("community_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("community_comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    },
    // Optimistic heart flip.
    onMutate: async ({ commentId, postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ["comment-likes", postId] });
      const snapshots = queryClient.getQueriesData<CommentLikes>({ queryKey: ["comment-likes", postId] });
      queryClient.setQueriesData<CommentLikes>({ queryKey: ["comment-likes", postId] }, (old) => {
        if (!old) return old;
        const counts = { ...old.counts, [commentId]: Math.max(0, (old.counts[commentId] || 0) + (liked ? -1 : 1)) };
        const mine = new Set(old.mine);
        if (liked) mine.delete(commentId);
        else mine.add(commentId);
        return { counts, mine };
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshots || []) queryClient.setQueryData(key, data);
    },
    onSettled: (_data, _err, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["comment-likes", postId] });
    },
  });
}

// ────────────────────────────────────────────────────────────
// Gap 3 — post search (server-side ilike, scoped to the creator)
// ────────────────────────────────────────────────────────────
export function useSearchCommunityPosts(creatorId: string | undefined, term: string) {
  // Strip characters that would break the PostgREST or() filter syntax.
  const sanitized = term.trim().replace(/[,()%_\\]/g, " ").replace(/\s+/g, " ").trim();
  return useQuery({
    queryKey: ["community-post-search", creatorId, sanitized],
    enabled: !!creatorId && sanitized.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("creator_id", creatorId!)
        .or(`title.ilike.%${sanitized}%,body.ilike.%${sanitized}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const posts = data || [];
      const authorIds = [...new Set(posts.map((p) => p.author_id))];
      if (authorIds.length === 0) return [];
      const profileMap = await fetchProfileMap(authorIds);
      return posts.map((p) => ({
        ...p,
        author_name: profileMap.get(p.author_id)?.display_name || "Member",
        author_avatar: profileMap.get(p.author_id)?.avatar_url || null,
      }));
    },
  });
}

// ────────────────────────────────────────────────────────────
// Gap 4 — member directory profile (bio + activity in this community)
// ────────────────────────────────────────────────────────────
export function useMemberCommunityProfile(
  userId: string | undefined,
  creatorId: string | undefined
) {
  return useQuery({
    queryKey: ["member-community-profile", userId, creatorId],
    enabled: !!userId && !!creatorId,
    queryFn: async () => {
      const [{ data: profile }, { count: postCount }] = await Promise.all([
        supabase
          .from("profiles_public")
          .select("user_id, username, display_name, avatar_url, bio")
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId!)
          .eq("author_id", userId!),
      ]);
      return { profile: profile || null, postCount: postCount || 0 };
    },
  });
}

// ────────────────────────────────────────────────────────────
// Gap 5 — calendar event RSVPs
// ────────────────────────────────────────────────────────────
export interface EventRsvpInfo {
  count: number;
  mine: boolean;
  attendees: { user_id: string; display_name: string; avatar_url: string | null }[];
}

export function useEventRsvps(eventIds: string[]) {
  const { user } = useAuth();
  const key = [...eventIds].sort();
  return useQuery({
    queryKey: ["event-rsvps", key],
    enabled: eventIds.length > 0,
    queryFn: async (): Promise<Record<string, EventRsvpInfo>> => {
      const { data, error } = await db
        .from("community_event_rsvps")
        .select("event_id, user_id")
        .in("event_id", eventIds);
      if (error) throw error;
      const rows = (data || []) as { event_id: string; user_id: string }[];
      const profileMap = await fetchProfileMap([...new Set(rows.map((r) => r.user_id))]);

      const result: Record<string, EventRsvpInfo> = {};
      for (const id of eventIds) result[id] = { count: 0, mine: false, attendees: [] };
      for (const row of rows) {
        const info = result[row.event_id];
        if (!info) continue;
        info.count += 1;
        if (user && row.user_id === user.id) info.mine = true;
        if (info.attendees.length < 5) {
          info.attendees.push({
            user_id: row.user_id,
            display_name: profileMap.get(row.user_id)?.display_name || "Member",
            avatar_url: profileMap.get(row.user_id)?.avatar_url || null,
          });
        }
      }
      return result;
    },
  });
}

export function useToggleRsvp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, going }: { eventId: string; going: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (going) {
        const { error } = await db
          .from("community_event_rsvps")
          .insert({ event_id: eventId, user_id: user.id, status: "going" });
        if (error) throw error;
        // +15 points awarded server-side by award_points_on_rsvp (20260706200000).
      } else {
        const { error } = await db
          .from("community_event_rsvps")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    // Optimistic Going toggle.
    onMutate: async ({ eventId, going }) => {
      await queryClient.cancelQueries({ queryKey: ["event-rsvps"] });
      const snapshots = queryClient.getQueriesData<Record<string, EventRsvpInfo>>({ queryKey: ["event-rsvps"] });
      queryClient.setQueriesData<Record<string, EventRsvpInfo>>({ queryKey: ["event-rsvps"] }, (old) => {
        if (!old || !old[eventId]) return old;
        const info = old[eventId];
        return {
          ...old,
          [eventId]: { ...info, mine: going, count: Math.max(0, info.count + (going ? 1 : -1)) },
        };
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshots || []) queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["event-rsvps"] });
      queryClient.invalidateQueries({ queryKey: ["member-points"] });
    },
  });
}
