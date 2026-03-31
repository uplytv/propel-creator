/**
 * Typed wrappers for Supabase tables not yet in the auto-generated types.
 * Centralises all `as any` casts to this single file so hook/component code stays clean.
 */
import { supabase } from "@/integrations/supabase/client";

// Helper: cast supabase.from() for tables missing from codegen types
function untypedFrom(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table);
}

// ── Typed table accessors ──────────────────────────────────────────────
export const tables = {
  videos: () => untypedFrom("videos"),
  videoLikes: () => untypedFrom("video_likes"),
  videoComments: () => untypedFrom("video_comments"),
  tickets: () => untypedFrom("tickets"),
  events: () => untypedFrom("events"),
  eventReminders: () => untypedFrom("event_reminders"),
  memberPoints: () => untypedFrom("member_points"),
  socialLinks: () => untypedFrom("social_links"),
  profilesPublic: () => untypedFrom("profiles_public"),
  webhookEventLog: () => untypedFrom("webhook_event_log"),
  waitlist: () => untypedFrom("waitlist"),
  uplyChannels: () => untypedFrom("uply_channels"),
} as const;

// ── Profile map helper (used across many hooks) ────────────────────────
export interface PublicProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export async function fetchProfileMap(userIds: string[]): Promise<Map<string, PublicProfile>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles_public")
    .select("user_id, display_name, avatar_url")
    .in("user_id", userIds);
  return new Map((data || []).map((p) => [p.user_id, p as PublicProfile]));
}
