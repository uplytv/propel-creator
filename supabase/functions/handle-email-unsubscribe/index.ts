import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type') || 'weekly_report_email';

    if (!token) {
      return new Response(buildHtmlPage('Missing Token', 'The unsubscribe link is invalid.'), {
        status: 400, headers: { 'Content-Type': 'text/html' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('email_unsubscribe_tokens')
      .select('email, used_at')
      .eq('token', token)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return new Response(buildHtmlPage('Invalid Link', 'This unsubscribe link is invalid or expired.'), {
        status: 404, headers: { 'Content-Type': 'text/html' },
      });
    }

    // Look up user via auth admin API by email
    const { data: userLookup } = await supabase.auth.admin.listUsers();
    const matchedUser = (userLookup?.users || []).find(
      (u: any) => u.email?.toLowerCase() === tokenRow.email.toLowerCase()
    );

    if (!matchedUser) {
      return new Response(buildHtmlPage('Error', 'Could not find your account.'), {
        status: 404, headers: { 'Content-Type': 'text/html' },
      });
    }

    // Map unsubscribe type to notification_preferences column
    const columnMap: Record<string, string> = {
      weekly_report_email: 'weekly_report_email',
      community_blast: 'member_joined_email', // reuse opt-out for blast emails
      new_follower_email: 'new_follower_email',
      tip_received_email: 'tip_received_email',
      member_joined_email: 'member_joined_email',
    };

    const column = columnMap[type] || 'weekly_report_email';

    // Upsert notification preferences to opt out
    const { error: upsertErr } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: matchedUser.id, [column]: false },
        { onConflict: 'user_id' }
      );

    if (upsertErr) {
      console.error('Failed to update preferences:', upsertErr);
      return new Response(buildHtmlPage('Error', 'Something went wrong. Please try again.'), {
        status: 500, headers: { 'Content-Type': 'text/html' },
      });
    }

    // Mark token as used
    await supabase
      .from('email_unsubscribe_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    const typeLabels: Record<string, string> = {
      weekly_report_email: 'ARIA Weekly Growth Reports',
      community_blast: 'community blast emails',
      new_follower_email: 'new follower notifications',
      tip_received_email: 'tip received notifications',
      member_joined_email: 'new member notifications',
    };

    const label = typeLabels[type] || type;

    return new Response(
      buildHtmlPage(
        'Unsubscribed ✓',
        `You have been unsubscribed from ${label}. You can re-enable them anytime in Settings → Notifications.`
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('handle-email-unsubscribe error:', error);
    return new Response(buildHtmlPage('Error', 'Something went wrong.'), {
      status: 500, headers: { 'Content-Type': 'text/html' },
    });
  }
});

function buildHtmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} – UPLY</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .card { background: #111111; border: 1px solid #1E1E1E; border-radius: 12px; padding: 40px; max-width: 420px; text-align: center; }
    h1 { font-size: 24px; color: #FFFFFF; margin: 0 0 12px; }
    p { font-size: 15px; color: #888888; line-height: 1.6; margin: 0; }
    a { display: inline-block; margin-top: 20px; color: #00FF85; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://uply.tv/settings">Go to Settings</a>
  </div>
</body>
</html>`;
}