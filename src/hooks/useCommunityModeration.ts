import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { fetchProfileMap } from "@/lib/supabaseTyped";

/**
 * Community moderation (migration 20260706153000_moderation.sql).
 */

export type ReportContentType = "post" | "comment" | "chat";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface CommunityReport {
  id: string;
  reporter_id: string;
  creator_id: string;
  content_type: ReportContentType;
  content_id: string;
  reason: string | null;
  status: ReportStatus;
  created_at: string;
  reporter_name: string;
  content_preview: string;
  /** post id to open for jump-to-content (the post itself, or a comment's parent) */
  jump_post_id: string | null;
}

// ── Member: report a post / comment / chat message ──
export function useReportContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: {
      creatorId: string;
      contentType: ReportContentType;
      contentId: string;
      reason: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("content_reports").insert({
        reporter_id: user.id,
        creator_id: report.creatorId,
        content_type: report.contentType,
        content_id: report.contentId,
        reason: report.reason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-reports"] });
    },
  });
}

// ── Owner: open reports with content previews ──
export function useOpenReports(creatorId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["community-reports", creatorId],
    enabled: !!creatorId && enabled,
    queryFn: async (): Promise<CommunityReport[]> => {
      const { data, error } = await supabase
        .from("content_reports")
        .select("*")
        .eq("creator_id", creatorId!)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const reports = (data || []) as Omit<CommunityReport, "reporter_name" | "content_preview" | "jump_post_id">[];
      if (reports.length === 0) return [];

      const idsByType = (type: ReportContentType) =>
        [...new Set(reports.filter((r) => r.content_type === type).map((r) => r.content_id))];

      const [profileMap, postsRes, commentsRes, chatRes] = await Promise.all([
        fetchProfileMap([...new Set(reports.map((r) => r.reporter_id))]),
        idsByType("post").length
          ? supabase.from("community_posts").select("id, title, body").in("id", idsByType("post"))
          : Promise.resolve({ data: [] as any[] }),
        idsByType("comment").length
          ? supabase.from("community_comments").select("id, body, post_id").in("id", idsByType("comment"))
          : Promise.resolve({ data: [] as any[] }),
        idsByType("chat").length
          ? supabase.from("live_chat_messages").select("id, message, username").in("id", idsByType("chat"))
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const postMap = new Map((postsRes.data || []).map((p: any) => [p.id, p]));
      const commentMap = new Map((commentsRes.data || []).map((c: any) => [c.id, c]));
      const chatMap = new Map((chatRes.data || []).map((m: any) => [m.id, m]));

      return reports.map((r) => {
        let preview = "Content no longer available";
        let jumpPostId: string | null = null;
        if (r.content_type === "post") {
          const p = postMap.get(r.content_id);
          if (p) {
            preview = p.title ? `${p.title} — ${p.body}` : p.body;
            jumpPostId = p.id;
          }
        } else if (r.content_type === "comment") {
          const c = commentMap.get(r.content_id);
          if (c) {
            preview = c.body;
            jumpPostId = c.post_id;
          }
        } else {
          const m = chatMap.get(r.content_id);
          if (m) preview = `${m.username}: ${m.message}`;
        }
        return {
          ...r,
          reporter_name: profileMap.get(r.reporter_id)?.display_name || "Member",
          content_preview: preview,
          jump_post_id: jumpPostId,
        };
      });
    },
  });
}

// ── Owner: resolve / dismiss a report ──
export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: ReportStatus }) => {
      const { error } = await supabase
        .from("content_reports")
        .update({ status })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-reports"] });
    },
  });
}

// ── Owner: ban a member (records ban + removes them from the roster) ──
export function useBanCommunityMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, reason }: { targetUserId: string; reason?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error: banError } = await supabase.from("community_bans").upsert(
        {
          creator_id: user.id,
          target_user_id: targetUserId,
          reason: reason?.trim() || null,
        },
        { onConflict: "creator_id,target_user_id" }
      );
      if (banError) throw banError;
      // Remove from roster (creator DELETE policy added in the moderation migration)
      const { error: removeError } = await supabase
        .from("community_members")
        .delete()
        .eq("creator_id", user.id)
        .eq("user_id", targetUserId);
      if (removeError) throw removeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-members"] });
    },
  });
}

// ── Owner: delete a post (existing RLS right; used from the moderation menu) ──
export function useDeleteCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}

// ── Owner or author: delete a comment ──
export function useDeleteCommunityComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId }: { commentId: string; postId: string }) => {
      const { error } = await supabase.from("community_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ["community-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
  });
}
