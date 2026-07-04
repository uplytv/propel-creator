import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { claudeChat } from "../_shared/claudeChat.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!Deno.env.get('ANTHROPIC_API_KEY')) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Determine if this is a single user request or a batch (cron)
    let targetUserIds: string[] = [];
    try {
      const body = await req.json();
      if (body.user_id) {
        targetUserIds = [body.user_id];
      }
    } catch {
      // No body = cron batch mode, process all creators
    }

    if (targetUserIds.length === 0) {
      // Get all creators who have profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .not('user_id', 'is', null);
      targetUserIds = (profiles || []).map((p: any) => p.user_id);
    }

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay()); // Last Sunday
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    let generated = 0;

    for (const userId of targetUserIds) {
      try {
        // Check if report already exists for this week
        const { data: existing } = await supabase
          .from('weekly_growth_reports')
          .select('id')
          .eq('user_id', userId)
          .eq('week_start', weekStartStr)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Gather creator data for the past week
        const [profileRes, followsRes, membersRes, productsRes, streamsRes, postsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', userId).single(),
          supabase.from('follows').select('id').eq('following_id', userId).gte('created_at', weekStart.toISOString()),
          supabase.from('community_members').select('id').eq('creator_id', userId).gte('joined_at', weekStart.toISOString()),
          supabase.from('products').select('id, name, sales, revenue').eq('user_id', userId),
          supabase.from('mux_live_streams').select('id, title, viewer_count, started_at').eq('user_id', userId).gte('created_at', weekStart.toISOString()),
          supabase.from('community_posts').select('id, like_count, comment_count').eq('creator_id', userId).gte('created_at', weekStart.toISOString()),
        ]);

        const profile = profileRes.data;
        if (!profile) continue;

        const newFollowers = followsRes.data?.length || 0;
        const newMembers = membersRes.data?.length || 0;
        const streamsThisWeek = streamsRes.data?.length || 0;
        const postsThisWeek = postsRes.data || [];
        const totalEngagement = postsThisWeek.reduce((sum: number, p: any) => sum + (p.like_count || 0) + (p.comment_count || 0), 0);

        const creatorContext = {
          display_name: profile.display_name || 'Creator',
          tier: profile.tier,
          tier_name: profile.tier_name,
          total_revenue: profile.total_revenue,
          mrr: profile.mrr,
          members: profile.members,
          new_followers_this_week: newFollowers,
          new_members_this_week: newMembers,
          streams_this_week: streamsThisWeek,
          posts_this_week: postsThisWeek.length,
          total_engagement_this_week: totalEngagement,
          products: (productsRes.data || []).map((p: any) => ({ name: p.name, sales: p.sales, revenue: p.revenue })),
        };

        // Generate report using Claude
        let aiData: any;
        try {
          aiData = await claudeChat({
            model: 'claude-fable-5',
            messages: [
              {
                role: 'system',
                content: `You are ARIA, the AI growth partner for UPLY creators. Generate a concise weekly growth report. Be direct, strategic, warm — never generic. Use the creator's actual data.

Format your response as JSON with these fields:
- "summary": 2-3 sentence overview of the week (what went well, what didn't)
- "highlights": array of 2-3 objects with "label" and "insight" (specific data-driven observations)
- "action_item": ONE specific thing to do this week (not a list, not options — one clear action)

Rules:
- Every insight must reference actual numbers from their data
- If numbers are low or zero, be honest — tell them why and what to fix
- Never say "Great job!" if the data doesn't support it
- The action item must be actionable TODAY, not vague
- Keep the entire report under 200 words`,
              },
              {
                role: 'user',
                content: `Generate my weekly growth report. Here's my data:\n${JSON.stringify(creatorContext, null, 2)}`,
              },
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'weekly_report',
                  description: 'Generate a structured weekly growth report',
                  parameters: {
                    type: 'object',
                    properties: {
                      summary: { type: 'string' },
                      highlights: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            label: { type: 'string' },
                            insight: { type: 'string' },
                          },
                          required: ['label', 'insight'],
                        },
                      },
                      action_item: { type: 'string' },
                    },
                    required: ['summary', 'highlights', 'action_item'],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: 'function', function: { name: 'weekly_report' } },
          });
        } catch (err) {
          console.error(`AI gateway error for user ${userId}:`, (err as Error).message);
          continue;
        }

        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          console.error(`No tool call in AI response for user ${userId}`);
          continue;
        }

        const report = JSON.parse(toolCall.function.arguments);

        // Save report
        await supabase.from('weekly_growth_reports').insert({
          user_id: userId,
          report_content: report.summary,
          highlights: report.highlights,
          action_item: report.action_item,
          week_start: weekStartStr,
          week_end: weekEndStr,
        });

        // Create notification
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'aria_report',
          title: '📊 Your Weekly Growth Report',
          message: `ARIA analyzed your week: ${report.action_item.substring(0, 100)}`,
          link: '/dashboard',
        });

        // Send email via transactional email queue (check opt-out first)
        try {
          // Check if user has opted out of weekly report emails
          const { data: emailPref } = await supabase
            .from('notification_preferences')
            .select('weekly_report_email')
            .eq('user_id', userId)
            .maybeSingle();

          const wantsEmail = emailPref?.weekly_report_email !== false; // default true

          // Get user email from auth
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          if (wantsEmail && authUser?.user?.email) {
            await fetch(`${supabaseUrl}/functions/v1/send-weekly-report-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                recipientEmail: authUser.user.email,
                displayName: profile.display_name || 'Creator',
                summary: report.summary,
                highlights: report.highlights,
                actionItem: report.action_item,
                weekStart: weekStartStr,
                weekEnd: weekEndStr,
              }),
            });
          }
        } catch (emailErr) {
          console.error(`Failed to send report email for ${userId}:`, emailErr);
          // Don't block report generation if email fails
        }

        generated++;
      } catch (err) {
        console.error(`Error generating report for ${userId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reports_generated: generated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('aria-weekly-report error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate reports' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
