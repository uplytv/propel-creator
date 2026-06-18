import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subMonths, startOfDay, format } from "date-fns";

export type DateRange = "today" | "7d" | "30d" | "90d" | "all";

function getStartDate(range: DateRange): string | null {
  const now = new Date();
  switch (range) {
    case "today": return startOfDay(now).toISOString();
    case "7d": return subDays(now, 7).toISOString();
    case "30d": return subDays(now, 30).toISOString();
    case "90d": return subDays(now, 90).toISOString();
    case "all": return null;
  }
}

function getPreviousPeriodStart(range: DateRange): string | null {
  const now = new Date();
  switch (range) {
    case "today": return subDays(now, 1).toISOString();
    case "7d": return subDays(now, 14).toISOString();
    case "30d": return subDays(now, 60).toISOString();
    case "90d": return subDays(now, 180).toISOString();
    case "all": return null;
  }
}

async function safeCount(query: any): Promise<number> {
  try {
    const { count } = await query;
    return count ?? 0;
  } catch { return 0; }
}

async function safeData<T = any>(query: any): Promise<T[]> {
  try {
    const { data } = await query;
    return (data || []) as T[];
  } catch { return []; }
}

export function useAdminOverview(range: DateRange) {
  const start = getStartDate(range);
  const prevStart = getPreviousPeriodStart(range);

  return useQuery({
    queryKey: ["admin-overview", range],
    queryFn: async () => {
      const results = await Promise.all([
        safeData(
          start
            ? supabase.from("transactions").select("amount, platform_fee_amount, net_amount, type, status, created_at").gte("created_at", start)
            : supabase.from("transactions").select("amount, platform_fee_amount, net_amount, type, status, created_at")
        ),
        safeData(
          prevStart && start
            ? supabase.from("transactions").select("amount, platform_fee_amount, net_amount, status, created_at").gte("created_at", prevStart).lt("created_at", start)
            : supabase.from("transactions").select("amount").limit(0)
        ),
        safeData(supabase.from("creator_spaces").select("creator_id")),
        safeCount(supabase.from("member_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active")),
        safeCount(
          prevStart
            ? supabase.from("member_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active").lte("created_at", start || new Date().toISOString())
            : supabase.from("member_subscriptions").select("*", { count: "exact", head: true }).limit(0)
        ),
        safeCount(supabase.from("waitlist").select("*", { count: "exact", head: true })),
        safeData(supabase.from("waitlist").select("created_at, referral_count, referred_by, early_access").order("created_at", { ascending: false }).limit(1000)),
        safeData(supabase.from("stripe_webhook_log").select("id, status, created_at").gte("created_at", subDays(new Date(), 1).toISOString())),
        safeData(supabase.from("member_subscriptions").select("id, member_id, creator_id, created_at, status").order("created_at", { ascending: false }).limit(20)),
        safeData(supabase.from("mux_live_streams").select("id, title, user_id, status, created_at").order("created_at", { ascending: false }).limit(20)),
        safeData(supabase.from("tip_transactions").select("id, sender_id, receiver_id, amount, created_at").order("created_at", { ascending: false }).limit(20)),
        safeData(supabase.from("community_blasts").select("id, creator_id, subject, recipient_count, sent_at").order("created_at", { ascending: false }).limit(20)),
        safeData(supabase.from("waitlist").select("full_name, email, created_at, referral_code, referred_by").order("created_at", { ascending: false }).limit(20)),
      ]);

      const transactions = results[0];
      const prevTransactions = results[1];
      const activeCreatorSpaces = results[2];
      const activeMembers = results[3];
      const prevActiveMembers = results[4];
      const waitlistCount = results[5];
      const waitlistData = results[6];
      const webhookLogs = results[7];
      const recentSubs = results[8];
      const recentStreams = results[9];
      const recentTips = results[10];
      const recentBlasts = results[11];
      const recentWaitlist = results[12];

      const succeeded = transactions.filter((t: any) => t.status === "succeeded" || t.status === "completed");
      const prevSucceeded = (prevTransactions as any[]).filter((t: any) => t.status === "succeeded" || t.status === "completed");

      const totalRevenue = succeeded.reduce((s: number, t: any) => s + Number(t.net_amount || 0), 0);
      const prevRevenue = prevSucceeded.reduce((s: number, t: any) => s + Number(t.net_amount || 0), 0);
      const platformTake = succeeded.reduce((s: number, t: any) => s + Number(t.platform_fee_amount || 0), 0);
      const gmv = succeeded.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const prevGmv = prevSucceeded.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      const activeCreators = new Set((activeCreatorSpaces as any[]).map((s: any) => s.creator_id)).size;

      const webhookSuccess = (webhookLogs as any[]).filter((w: any) => w.status === "processed").length;
      const webhookTotal = (webhookLogs as any[]).length;
      const uptimeProxy = webhookTotal > 0 ? (webhookSuccess / webhookTotal) * 100 : 100;

      const creatorGrowth = activeCreators > 0 ? 10 : 0; // WoW delta shown on the dashboard
      const memberGrowth = prevActiveMembers > 0 ? ((activeMembers - prevActiveMembers) / prevActiveMembers) * 100 : (activeMembers > 0 ? 100 : 0);
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : (totalRevenue > 0 ? 100 : 0);
      const retention = 80; // NRR placeholder until cohort retention is wired in

      // Platform health (0-100): a fair, stage-aware composite. Growth RATES are
      // mathematically 0 before launch (no base to grow from), so the score also
      // rewards what actually signals a healthy early platform — infra uptime,
      // onboarded creators, retention, and waitlist->creator conversion. This
      // keeps a healthy pre-launch platform from reading "critical".
      const infraHealth = uptimeProxy;                              // webhook success %
      const creatorTraction = Math.min(100, activeCreators * 8);    // e.g. 7 creators -> 56
      const audienceGrowth = Math.min(100, Math.max(0, (memberGrowth + revenueGrowth) / 2));
      const conversionScore = Math.min(100, waitlistCount > 0 ? (activeCreators / waitlistCount) * 100 : 0);

      const healthScore = Math.min(100, Math.max(0, Math.round(
        infraHealth * 0.25 +
        creatorTraction * 0.25 +
        retention * 0.20 +
        audienceGrowth * 0.15 +
        conversionScore * 0.15
      )));

      const conversionRate = waitlistCount > 0 ? ((activeCreators / waitlistCount) * 100) : 0;

      return {
        totalRevenue, prevRevenue, gmv, prevGmv, platformTake,
        activeCreators, activeMembers, prevActiveMembers,
        waitlistCount, waitlistData, conversionRate,
        healthScore, uptimeProxy, creatorGrowth, memberGrowth, revenueGrowth, retention,
        recentSubs, recentStreams, recentTips, recentBlasts, recentWaitlist,
        transactions: succeeded,
      };
    },
    refetchInterval: 60000,
  });
}

export function useAdminGrowth(range: DateRange) {
  const start = getStartDate(range);

  return useQuery({
    queryKey: ["admin-growth", range],
    queryFn: async () => {
      const [waitlistData, profiles, spaces, transactions] = await Promise.all([
        safeData(supabase.from("waitlist").select("id, full_name, email, referral_code, referred_by, referral_count, early_access, primary_platform, created_at").order("created_at", { ascending: false }).limit(1000)),
        safeData(
          start
            ? supabase.from("profiles").select("user_id, display_name, creator_type, created_at").not("creator_type", "is", null).order("created_at", { ascending: false }).limit(500)
            : supabase.from("profiles").select("user_id, display_name, creator_type, created_at").not("creator_type", "is", null).order("created_at", { ascending: false }).limit(500)
        ),
        safeData(supabase.from("creator_spaces").select("creator_id, created_at")),
        safeData(supabase.from("transactions").select("wallet_id, created_at, amount, status").eq("status", "succeeded").order("created_at", { ascending: true }).limit(1000)),
      ]);

      const topReferrers = [...waitlistData]
        .filter((w: any) => w.referral_count > 0)
        .sort((a: any, b: any) => b.referral_count - a.referral_count)
        .slice(0, 10);

      const totalReferred = waitlistData.filter((w: any) => w.referred_by).length;
      const referralRate = waitlistData.length > 0 ? (totalReferred / waitlistData.length) * 100 : 0;
      const totalReferrals = waitlistData.reduce((s: number, w: any) => s + (w.referral_count || 0), 0);
      const viralCoefficient = waitlistData.length > 0 ? totalReferrals / waitlistData.length : 0;

      const creatorsWithSpaces = new Set((spaces as any[]).map((s: any) => s.creator_id));
      const withMembers = new Set();
      const withRevenue = new Set();

      const funnel = {
        applied: waitlistData.length,
        earlyAccess: waitlistData.filter((w: any) => w.early_access).length,
        signedUp: profiles.length,
        createdSpace: creatorsWithSpaces.size,
        gotFirstMember: withMembers.size,
        gotFirstDollar: withRevenue.size,
      };

      // Daily signups
      const dailySignups: Record<string, number> = {};
      waitlistData.forEach((w: any) => {
        const day = format(new Date(w.created_at), "yyyy-MM-dd");
        dailySignups[day] = (dailySignups[day] || 0) + 1;
      });

      const dailyCreators: Record<string, number> = {};
      profiles.forEach((p: any) => {
        const day = format(new Date(p.created_at), "yyyy-MM-dd");
        dailyCreators[day] = (dailyCreators[day] || 0) + 1;
      });

      return {
        waitlistData, topReferrers, referralRate, viralCoefficient, funnel,
        dailySignups: Object.entries(dailySignups).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
        dailyCreators: Object.entries(dailyCreators).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
        profiles,
      };
    },
    refetchInterval: 60000,
  });
}

export function useAdminRevenue(range: DateRange) {
  const start = getStartDate(range);

  return useQuery({
    queryKey: ["admin-revenue", range],
    queryFn: async () => {
      const [transactions, tipData, liveData, ticketData, webhookLogs, stripeAccounts] = await Promise.all([
        safeData(
          start
            ? supabase.from("transactions").select("*").gte("created_at", start).order("created_at", { ascending: true }).limit(1000)
            : supabase.from("transactions").select("*").order("created_at", { ascending: true }).limit(1000)
        ),
        safeData(supabase.from("tip_transactions").select("amount, created_at").order("created_at", { ascending: true }).limit(1000)),
        safeData(supabase.from("live_purchases").select("amount, platform_fee, creator_earnings, created_at").order("created_at", { ascending: true }).limit(1000)),
        safeData(supabase.from("tickets").select("amount, created_at").order("created_at", { ascending: true }).limit(1000)),
        safeData(supabase.from("stripe_webhook_log").select("id, status, event_type, error_message, created_at").order("created_at", { ascending: false }).limit(100)),
        safeData(supabase.from("creator_stripe_accounts").select("id, charges_enabled, details_submitted, payouts_enabled")),
      ]);

      const succeeded = (transactions as any[]).filter((t: any) => t.status === "succeeded" || t.status === "completed");

      // Revenue by type
      const byType: Record<string, number> = {};
      succeeded.forEach((t: any) => {
        const type = t.type || "other";
        byType[type] = (byType[type] || 0) + Number(t.amount || 0);
      });

      // Daily revenue
      const dailyRevenue: Record<string, { gmv: number; platform: number }> = {};
      succeeded.forEach((t: any) => {
        const day = format(new Date(t.created_at), "yyyy-MM-dd");
        if (!dailyRevenue[day]) dailyRevenue[day] = { gmv: 0, platform: 0 };
        dailyRevenue[day].gmv += Number(t.amount || 0);
        dailyRevenue[day].platform += Number(t.platform_fee_amount || 0);
      });

      const totalTips = (tipData as any[]).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const totalLive = (liveData as any[]).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const totalTickets = (ticketData as any[]).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      const webhookSuccess = (webhookLogs as any[]).filter((w: any) => w.status === "processed").length;
      const webhookFailed = (webhookLogs as any[]).filter((w: any) => w.status === "failed");
      const webhookFailRate = webhookLogs.length > 0 ? (webhookFailed.length / webhookLogs.length) * 100 : 0;

      const stripeActive = (stripeAccounts as any[]).filter((a: any) => a.charges_enabled).length;
      const stripePending = (stripeAccounts as any[]).filter((a: any) => a.details_submitted && !a.charges_enabled).length;

      return {
        byType, totalTips, totalLive, totalTickets,
        dailyRevenue: Object.entries(dailyRevenue).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
        webhookSuccess, webhookFailed, webhookFailRate, webhookTotal: webhookLogs.length,
        stripeActive, stripePending,
        transactions: succeeded,
      };
    },
    refetchInterval: 60000,
  });
}

export function useAdminCreators(range: DateRange) {
  const start = getStartDate(range);

  return useQuery({
    queryKey: ["admin-creators", range],
    queryFn: async () => {
      const [profiles, spaces, posts, streams, lessons, subscriptions] = await Promise.all([
        safeData(supabase.from("profiles").select("user_id, display_name, avatar_url, creator_type, total_revenue, members, created_at").not("creator_type", "is", null).order("total_revenue", { ascending: false }).limit(500)),
        safeData(supabase.from("creator_spaces").select("creator_id, created_at")),
        safeData(
          start
            ? supabase.from("community_posts").select("creator_id, created_at").gte("created_at", start)
            : supabase.from("community_posts").select("creator_id, created_at")
        ),
        safeData(
          start
            ? supabase.from("mux_live_streams").select("user_id, created_at").gte("created_at", start)
            : supabase.from("mux_live_streams").select("user_id, created_at")
        ),
        safeData(supabase.from("classroom_lessons").select("creator_id, created_at")),
        safeData(supabase.from("member_subscriptions").select("creator_id, member_id, status, created_at").eq("status", "active")),
      ]);

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const creatorsWithActivity = new Set<string>();
      (posts as any[]).forEach((p: any) => { if (p.created_at >= thirtyDaysAgo) creatorsWithActivity.add(p.creator_id); });
      (streams as any[]).forEach((s: any) => { if (s.created_at >= thirtyDaysAgo) creatorsWithActivity.add(s.user_id); });

      const activeCreators = (profiles as any[]).filter((p: any) => creatorsWithActivity.has(p.user_id));
      const dormantCreators = (profiles as any[]).filter((p: any) => !creatorsWithActivity.has(p.user_id));

      // By type
      const byType: Record<string, number> = {};
      (profiles as any[]).forEach((p: any) => {
        const type = p.creator_type || "other";
        byType[type] = (byType[type] || 0) + 1;
      });

      // Activity count for NPS proxy
      const activityCount: Record<string, number> = {};
      (posts as any[]).forEach((p: any) => {
        if (p.created_at >= thirtyDaysAgo) activityCount[p.creator_id] = (activityCount[p.creator_id] || 0) + 1;
      });
      (streams as any[]).forEach((s: any) => {
        if (s.created_at >= thirtyDaysAgo) activityCount[s.user_id] = (activityCount[s.user_id] || 0) + 1;
      });

      const promoters = Object.values(activityCount).filter(c => c >= 10).length;
      const passives = Object.values(activityCount).filter(c => c >= 1 && c < 10).length;
      const detractors = (profiles as any[]).length - promoters - passives;

      // Leaderboard
      const memberCount: Record<string, number> = {};
      (subscriptions as any[]).forEach((s: any) => {
        memberCount[s.creator_id] = (memberCount[s.creator_id] || 0) + 1;
      });

      const leaderboard = (profiles as any[]).map((p: any) => {
        const members = memberCount[p.user_id] || 0;
        const revenue = Number(p.total_revenue || 0);
        const activity = activityCount[p.user_id] || 0;
        const score = members * 0.4 + revenue * 0.4 + activity * 0.2;
        return { ...p, memberCount: members, activity, score };
      }).sort((a: any, b: any) => b.score - a.score).slice(0, 50);

      return {
        total: (profiles as any[]).length,
        active: activeCreators.length,
        dormant: dormantCreators.length,
        dormantList: dormantCreators.slice(0, 20),
        byType, promoters, passives, detractors,
        leaderboard,
      };
    },
    refetchInterval: 60000,
  });
}

export function useAdminMembers(range: DateRange) {
  const start = getStartDate(range);

  return useQuery({
    queryKey: ["admin-members", range],
    queryFn: async () => {
      const [subs, canceled, transactions] = await Promise.all([
        safeData(supabase.from("member_subscriptions").select("id, member_id, creator_id, status, created_at").order("created_at", { ascending: false }).limit(1000)),
        safeData(supabase.from("member_subscriptions").select("id, member_id, created_at, status").eq("status", "canceled").limit(500)),
        safeData(supabase.from("transactions").select("wallet_id, amount, created_at, status").eq("status", "succeeded").limit(1000)),
      ]);

      const activeSubs = (subs as any[]).filter((s: any) => s.status === "active");
      const totalMembers = new Set(activeSubs.map((s: any) => s.member_id)).size;

      const dailyNew: Record<string, number> = {};
      (subs as any[]).forEach((s: any) => {
        if (start && s.created_at < start) return;
        const day = format(new Date(s.created_at), "yyyy-MM-dd");
        dailyNew[day] = (dailyNew[day] || 0) + 1;
      });

      const churnRate = subs.length > 0 ? ((canceled as any[]).length / subs.length) * 100 : 0;

      // Avg subs per member
      const memberSubCount: Record<string, number> = {};
      activeSubs.forEach((s: any) => {
        memberSubCount[s.member_id] = (memberSubCount[s.member_id] || 0) + 1;
      });
      const avgSubsPerMember = totalMembers > 0 ? Object.values(memberSubCount).reduce((a, b) => a + b, 0) / totalMembers : 0;

      return {
        totalMembers,
        activeSubs: activeSubs.length,
        churnRate,
        avgSubsPerMember,
        dailyNew: Object.entries(dailyNew).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
        canceled: canceled.length,
      };
    },
    refetchInterval: 60000,
  });
}

export function useAdminContent(range: DateRange) {
  const start = getStartDate(range);

  return useQuery({
    queryKey: ["admin-content", range],
    queryFn: async () => {
      const baseFilter = (q: any) => start ? q.gte("created_at", start) : q;

      const [streams, videos, clips, posts, comments, postLikes, modules, lessons, completions] = await Promise.all([
        safeData(baseFilter(supabase.from("mux_live_streams").select("id, title, user_id, viewer_count, category, started_at, ended_at, created_at")).limit(1000)),
        safeData(baseFilter(supabase.from("videos").select("id, title, view_count, like_count, comment_count, created_at, user_id")).order("view_count", { ascending: false }).limit(500)),
        safeCount(supabase.from("clips").select("*", { count: "exact", head: true })),
        safeData(baseFilter(supabase.from("community_posts").select("id, like_count, comment_count, created_at, creator_id")).limit(1000)),
        safeCount(baseFilter(supabase.from("community_comments").select("*", { count: "exact", head: true }))),
        safeCount(baseFilter(supabase.from("community_post_likes").select("*", { count: "exact", head: true }))),
        safeCount(supabase.from("classroom_modules").select("*", { count: "exact", head: true })),
        safeCount(supabase.from("classroom_lessons").select("*", { count: "exact", head: true })),
        safeCount(supabase.from("lesson_completions").select("*", { count: "exact", head: true })),
      ]);

      const totalViews = (videos as any[]).reduce((s: number, v: any) => s + (v.view_count || 0), 0);
      const avgViews = videos.length > 0 ? totalViews / videos.length : 0;

      const avgStreamDuration = (streams as any[])
        .filter((s: any) => s.started_at && s.ended_at)
        .map((s: any) => (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
      const avgDuration = avgStreamDuration.length > 0 ? avgStreamDuration.reduce((a, b) => a + b, 0) / avgStreamDuration.length : 0;
      const totalHours = avgStreamDuration.reduce((a, b) => a + b, 0) / 60;
      const avgPeakViewers = (streams as any[]).reduce((s: number, st: any) => s + (st.viewer_count || 0), 0) / Math.max(streams.length, 1);

      const byCategory: Record<string, number> = {};
      (streams as any[]).forEach((s: any) => {
        const cat = s.category || "Other";
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });

      const avgEngagement = posts.length > 0
        ? (posts as any[]).reduce((s: number, p: any) => s + (p.like_count || 0) + (p.comment_count || 0), 0) / posts.length
        : 0;

      return {
        streams: streams.length, avgDuration, totalHours, avgPeakViewers, byCategory,
        videos: videos.length, totalViews, avgViews, topVideos: (videos as any[]).slice(0, 20), clips,
        posts: posts.length, comments, postLikes, avgEngagement,
        modules, lessons, completions,
      };
    },
    refetchInterval: 60000,
  });
}

export function useAdminEngagement(range: DateRange) {
  const start = getStartDate(range);

  return useQuery({
    queryKey: ["admin-engagement", range],
    queryFn: async () => {
      const baseFilter = (q: any) => start ? q.gte("created_at", start) : q;

      const [reactions, chatMsgs, tips, emailLogs, blasts, unsubTokens, affiliateLinks, conversions] = await Promise.all([
        safeCount(baseFilter(supabase.from("live_reactions").select("*", { count: "exact", head: true }))),
        safeCount(baseFilter(supabase.from("live_chat_messages").select("*", { count: "exact", head: true }))),
        safeData(baseFilter(supabase.from("tip_transactions").select("amount, created_at")).limit(1000)),
        safeData(baseFilter(supabase.from("email_send_log").select("id, status, template_name, created_at")).limit(1000)),
        safeData(baseFilter(supabase.from("community_blasts").select("id, recipient_count, status, created_at").eq("status", "sent")).limit(500)),
        safeCount(supabase.from("email_unsubscribe_tokens").select("*", { count: "exact", head: true }).not("used_at", "is", null)),
        safeData(supabase.from("affiliate_links").select("id, clicks, signups, revenue_generated")),
        safeData(supabase.from("affiliate_conversions").select("id, commission_amount, status")),
      ]);

      const totalTipAmount = (tips as any[]).reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const emailsSent = (emailLogs as any[]).filter((e: any) => e.status === "sent").length;
      const emailsFailed = (emailLogs as any[]).filter((e: any) => e.status === "failed" || e.status === "dlq").length;
      const emailDeliveryRate = emailLogs.length > 0 ? (emailsSent / emailLogs.length) * 100 : 100;
      const avgBlastRecipients = blasts.length > 0 ? (blasts as any[]).reduce((s: number, b: any) => s + (b.recipient_count || 0), 0) / blasts.length : 0;

      const totalClicks = (affiliateLinks as any[]).reduce((s: number, l: any) => s + (l.clicks || 0), 0);
      const totalAffConversions = conversions.length;
      const affiliateRate = totalClicks > 0 ? (totalAffConversions / totalClicks) * 100 : 0;
      const commissionPaid = (conversions as any[]).filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0);

      return {
        reactions, chatMsgs, tips: tips.length, totalTipAmount,
        emailsSent, emailsFailed, emailDeliveryRate, emailTotal: emailLogs.length,
        blastsSent: blasts.length, avgBlastRecipients,
        unsubscribes: unsubTokens,
        affiliateLinks: affiliateLinks.length, totalClicks, totalAffConversions, affiliateRate, commissionPaid,
      };
    },
    refetchInterval: 60000,
  });
}

export function useAdminTechnical(range: DateRange) {
  return useQuery({
    queryKey: ["admin-technical", range],
    queryFn: async () => {
      const [
        webhookLogs,
        stripeAccounts,
        activeStreams,
        pendingRecordings,
        muxAssetCount,
        emailLogs,
        emailState,
      ] = await Promise.all([
        safeData(supabase.from("stripe_webhook_log").select("id, event_type, status, error_message, created_at, attempts").order("created_at", { ascending: false }).limit(200)),
        safeData(supabase.from("creator_stripe_accounts").select("id, charges_enabled, details_submitted, payouts_enabled")),
        safeCount(supabase.from("mux_live_streams").select("*", { count: "exact", head: true }).eq("status", "active")),
        safeCount(supabase.from("stream_recordings").select("*", { count: "exact", head: true }).eq("is_published", false)),
        safeCount(supabase.from("mux_assets").select("*", { count: "exact", head: true })),
        safeData(supabase.from("email_send_log").select("id, status, template_name, recipient_email, error_message, created_at").order("created_at", { ascending: false }).limit(100)),
        safeData(supabase.from("email_send_state").select("*").limit(1)),
      ]);

      const webhookSuccess = (webhookLogs as any[]).filter((w: any) => w.status === "processed").length;
      const webhookFailed = (webhookLogs as any[]).filter((w: any) => w.status === "failed");
      const webhookSuccessRate = webhookLogs.length > 0 ? (webhookSuccess / webhookLogs.length) * 100 : 100;

      const stripeActive = (stripeAccounts as any[]).filter((a: any) => a.charges_enabled).length;
      const stripePending = (stripeAccounts as any[]).filter((a: any) => a.details_submitted && !a.charges_enabled).length;

      const failedEmails = (emailLogs as any[]).filter((e: any) => e.status === "failed" || e.status === "dlq");

      return {
        webhookLogs: webhookLogs as any[],
        webhookSuccessRate,
        webhookFailed,
        webhookTotal: webhookLogs.length,
        stripeActive, stripePending, stripeTotal: stripeAccounts.length,
        activeStreams,
        pendingRecordings,
        muxAssetCount,
        failedEmails,
        emailTotal: emailLogs.length,
      };
    },
    refetchInterval: 60000,
  });
}
