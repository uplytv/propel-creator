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
  // Content
  videos: () => untypedFrom("videos"),
  videoLikes: () => untypedFrom("video_likes"),
  videoComments: () => untypedFrom("video_comments"),
  videoCommentLikes: () => untypedFrom("video_comment_likes"),
  shorts: () => untypedFrom("shorts"),
  clips: () => untypedFrom("clips"),

  // Events & Tickets
  tickets: () => untypedFrom("tickets"),
  events: () => untypedFrom("events"),
  eventReminders: () => untypedFrom("event_reminders"),
  eventWaitlist: () => untypedFrom("event_waitlist"),
  eventReviews: () => untypedFrom("event_reviews"),
  eventCheckins: () => untypedFrom("event_checkins"),
  attendance: () => untypedFrom("attendance"),

  // Social
  heys: () => untypedFrom("heys"),
  stories: () => untypedFrom("stories"),
  storyReactions: () => untypedFrom("story_reactions"),
  sharedPlans: () => untypedFrom("shared_plans"),
  sharedPlanMembers: () => untypedFrom("shared_plan_members"),
  follows: () => untypedFrom("follows"),
  channelFollows: () => untypedFrom("channel_follows"),
  socialPosts: () => untypedFrom("social_posts"),
  socialPostReactions: () => untypedFrom("social_post_reactions"),
  socialPostComments: () => untypedFrom("social_post_comments"),

  // Profiles & Users
  profiles: () => untypedFrom("profiles"),
  profilesPublic: () => untypedFrom("profiles_public"),
  socialLinks: () => untypedFrom("social_links"),
  bioLinks: () => untypedFrom("bio_links"),

  // Community
  communityMembers: () => untypedFrom("community_members"),
  communityPosts: () => untypedFrom("community_posts"),
  communityComments: () => untypedFrom("community_comments"),
  communityPostLikes: () => untypedFrom("community_post_likes"),
  communityBlasts: () => untypedFrom("community_blasts"),

  // Commerce
  products: () => untypedFrom("products"),
  memberSubscriptions: () => untypedFrom("member_subscriptions"),
  subscriptionTiers: () => untypedFrom("subscription_tiers"),
  memberPoints: () => untypedFrom("member_points"),
  creatorStripeAccounts: () => untypedFrom("creator_stripe_accounts"),

  // Streaming
  muxLiveStreams: () => untypedFrom("mux_live_streams"),
  liveChatMessages: () => untypedFrom("live_chat_messages"),
  streamRecordings: () => untypedFrom("stream_recordings"),
  scheduledStreams: () => untypedFrom("scheduled_streams"),

  // Notifications
  notifications: () => untypedFrom("notifications"),
  notificationPreferences: () => untypedFrom("notification_preferences"),
  pushSubscriptions: () => untypedFrom("push_subscriptions"),

  // Jobs & Collabs
  jobs: () => untypedFrom("jobs"),
  jobApplications: () => untypedFrom("job_applications"),
  collaborations: () => untypedFrom("collaborations"),

  // Misc
  inviteCodes: () => untypedFrom("invite_codes"),
  referrals: () => untypedFrom("referrals"),
  waitlist: () => untypedFrom("waitlist"),
  uplyChannels: () => untypedFrom("uply_channels"),
  webhookEventLog: () => untypedFrom("webhook_event_log"),
  creatorSpaces: () => untypedFrom("creator_spaces"),
  creatorPages: () => untypedFrom("creator_pages"),
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
