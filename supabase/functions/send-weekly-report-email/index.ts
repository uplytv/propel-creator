import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { constantTimeEqual } from "../_shared/constantTime.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function buildReportEmailHtml(report: {
  displayName: string;
  summary: string;
  highlights: { label: string; insight: string }[];
  actionItem: string;
  weekStart: string;
  weekEnd: string;
  unsubscribeUrl?: string;
}) {
  const primaryColor = 'hsl(265, 85%, 58%)';
  const primaryForeground = '#ffffff';
  const foreground = 'hsl(260, 10%, 10%)';
  const mutedForeground = 'hsl(260, 5%, 45%)';
  const background = 'hsl(0, 0%, 98%)';
  const cardBg = '#ffffff';

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const highlightRows = report.highlights
    .map(
      (h) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
          <div style="font-weight: 600; color: ${foreground}; font-size: 14px; margin-bottom: 2px;">${escapeHtml(h.label)}</div>
          <div style="color: ${mutedForeground}; font-size: 13px; line-height: 1.5;">${escapeHtml(h.insight)}</div>
        </td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: ${background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${background}; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: ${cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, ${primaryColor}, hsl(280, 80%, 50%)); padding: 28px 24px; text-align: center;">
            <div style="font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">ARIA Weekly Report</div>
            <div style="font-size: 20px; font-weight: 700; color: ${primaryForeground};">${formatDate(report.weekStart)} – ${formatDate(report.weekEnd)}</div>
          </td>
        </tr>

        <!-- Greeting + Summary -->
        <tr>
          <td style="padding: 24px 24px 16px;">
            <div style="font-size: 16px; font-weight: 600; color: ${foreground}; margin-bottom: 12px;">Hey ${escapeHtml(report.displayName)} 👋</div>
            <div style="font-size: 14px; color: ${mutedForeground}; line-height: 1.6;">${escapeHtml(report.summary)}</div>
          </td>
        </tr>

        <!-- Highlights -->
        <tr>
          <td style="padding: 8px 24px 4px;">
            <div style="font-size: 12px; font-weight: 600; color: ${mutedForeground}; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;">Key Insights</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 8px; overflow: hidden;">
              ${highlightRows}
            </table>
          </td>
        </tr>

        <!-- Action Item -->
        <tr>
          <td style="padding: 20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, hsl(265, 85%, 96%), hsl(280, 80%, 95%)); border-radius: 8px; border-left: 4px solid ${primaryColor};">
              <tr>
                <td style="padding: 16px;">
                  <div style="font-size: 11px; font-weight: 700; color: ${primaryColor}; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px;">🎯 This Week's Focus</div>
                  <div style="font-size: 14px; color: ${foreground}; line-height: 1.5; font-weight: 500;">${escapeHtml(report.actionItem)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding: 4px 24px 24px; text-align: center;">
            <a href="https://propel-creator.lovable.app/dashboard" style="display: inline-block; background: ${primaryColor}; color: ${primaryForeground}; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">View Full Report</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 16px 24px; border-top: 1px solid #f0f0f0; text-align: center;">
            <div style="font-size: 12px; color: #999; margin-bottom: 8px;">Powered by ARIA · Your AI Growth Partner on UPLY</div>
            ${report.unsubscribeUrl ? `<div style="font-size: 11px;"><a href="${escapeHtml(report.unsubscribeUrl)}" style="color: #999; text-decoration: underline;">Unsubscribe from weekly reports</a></div>` : ''}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = req.headers.get('Authorization');
    if (!serviceRoleKey || !authorization?.startsWith('Bearer ') ||
        !await constantTimeEqual(authorization.slice(7), serviceRoleKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) throw new Error('Missing backend configuration');

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { recipientEmail, displayName, summary, highlights, actionItem, weekStart, weekEnd } = await req.json();

    const shortString = (value: unknown) => value === undefined ||
      (typeof value === 'string' && value.length <= 500);
    if (typeof recipientEmail !== 'string' || recipientEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) ||
        typeof summary !== 'string' || !summary || summary.length > 2000 ||
        ![displayName, actionItem, weekStart, weekEnd].every(shortString) ||
        (highlights !== undefined && (!Array.isArray(highlights) || highlights.length > 10 ||
          !highlights.every((h: unknown) => h !== null && typeof h === 'object' &&
            typeof (h as { label?: unknown }).label === 'string' &&
            typeof (h as { insight?: unknown }).insight === 'string' &&
            shortString((h as { label: string }).label) && shortString((h as { insight: string }).insight))))) {
      return new Response(JSON.stringify({ error: 'Invalid report fields or length limits exceeded' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate or reuse unsubscribe token for this email
    let unsubscribeUrl = '';
    const { data: existingToken } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', recipientEmail)
      .is('used_at', null)
      .maybeSingle();

    const token = existingToken?.token || crypto.randomUUID();

    if (!existingToken) {
      await supabase.from('email_unsubscribe_tokens').insert({
        email: recipientEmail,
        token,
      });
    }

    unsubscribeUrl = `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}&type=weekly_report_email`;

    const html = buildReportEmailHtml({
      displayName: displayName || 'Creator',
      summary,
      highlights: highlights || [],
      actionItem: actionItem || '',
      weekStart: weekStart || '',
      weekEnd: weekEnd || '',
      unsubscribeUrl,
    });

    const messageId = `aria-report-${weekStart}-${crypto.randomUUID().slice(0, 8)}`;

    // Enqueue to transactional email queue
    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        run_id: crypto.randomUUID(),
        to: recipientEmail,
        from: 'UPLY <noreply@notify.uply.tv>',
        sender_domain: 'notify.uply.tv',
        subject: `📊 Your Weekly Growth Report – ${new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        html,
        text: `${summary}\n\nThis week's focus: ${actionItem}`,
        purpose: 'transactional',
        label: 'aria-weekly-report',
        message_id: messageId,
        idempotency_key: messageId,
        queued_at: new Date().toISOString(),
      },
    });

    if (enqueueError) {
      console.error('Failed to enqueue email:', enqueueError);
      return new Response(JSON.stringify({ error: 'Failed to queue email' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log pending
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'aria-weekly-report',
      recipient_email: recipientEmail,
      status: 'pending',
    });

    return new Response(JSON.stringify({ success: true, message_id: messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-weekly-report-email error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
