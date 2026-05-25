const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

function wrapLinksForTracking(html: string, broadcastId: string, email: string, trackBaseUrl: string): string {
  // Wrap <a href="..."> links with click tracking redirect
  return html.replace(
    /(<a\s[^>]*href=["'])([^"']+)(["'][^>]*>)/gi,
    (match, prefix, url, suffix) => {
      // Don't track unsubscribe links or mailto
      if (url.includes('unsubscribe') || url.startsWith('mailto:')) return match
      const trackUrl = `${trackBaseUrl}?bid=${broadcastId}&e=${encodeURIComponent(email)}&t=click&url=${encodeURIComponent(url)}`
      return `${prefix}${trackUrl}${suffix}`
    }
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // AuthN: require JWT
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    let userId: string | null = null
    if (token !== serviceKey) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
      const { data: { user }, error: authErr } = await userClient.auth.getUser(token)
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      userId = user.id
    }

    const { broadcastId, subject, htmlBody, recipients, creatorName, creatorAvatar } = await req.json()

    if (!broadcastId || !subject || !htmlBody || !recipients?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // AuthZ: verify the broadcast belongs to the authenticated user (skip for service-role)
    if (userId) {
      const { data: bcast } = await supabase
        .from('email_broadcasts')
        .select('creator_id')
        .eq('id', broadcastId)
        .maybeSingle()
      if (!bcast || bcast.creator_id !== userId) {
        return new Response(JSON.stringify({ error: 'Broadcast not found or access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Limit recipients to this creator's actual subscribers — blocks arbitrary-recipient phishing
      const requested = recipients.map((r: any) => r.email).filter(Boolean)
      const { data: validSubs } = await supabase
        .from('subscribers')
        .select('email')
        .eq('creator_id', userId)
        .in('email', requested)
      const allowed = new Set((validSubs || []).map((s: any) => s.email))
      ;(recipients as any[]).splice(0, recipients.length, ...recipients.filter((r: any) => allowed.has(r.email)))
      if (!recipients.length) {
        return new Response(JSON.stringify({ error: 'No valid recipients' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const trackBaseUrl = `${supabaseUrl}/functions/v1/track-email`

    // Check suppression list
    const emails = recipients.map((r: any) => r.email)
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('email')
      .in('email', emails)

    const suppressedSet = new Set((suppressed || []).map((s: any) => s.email))
    const { data: unsubs } = await supabase
      .from('subscribers')
      .select('email')
      .in('email', emails)
      .eq('unsubscribed', true)

    const unsubSet = new Set((unsubs || []).map((u: any) => u.email))

    const validRecipients = recipients.filter(
      (r: any) => !suppressedSet.has(r.email) && !unsubSet.has(r.email)
    )

    let delivered = 0
    let failed = 0

    // Send in batches of 10
    for (let i = 0; i < validRecipients.length; i += 10) {
      const batch = validRecipients.slice(i, i + 10)

      await Promise.allSettled(
        batch.map(async (recipient: any) => {
          try {
            const unsubUrl = `https://uply.tv/unsubscribe?email=${encodeURIComponent(recipient.email)}`
            const openPixelUrl = `${trackBaseUrl}?bid=${broadcastId}&e=${encodeURIComponent(recipient.email)}&t=open`

            // Wrap links for click tracking
            const trackedBody = wrapLinksForTracking(htmlBody, broadcastId, recipient.email, trackBaseUrl)

            const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#6366f1,#3b82f6);border-radius:16px;padding:24px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        ${creatorAvatar ? `<img src="${creatorAvatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />` : ''}
        <span style="color:white;font-weight:bold;font-size:16px;">${creatorName}</span>
      </div>
      <h1 style="color:white;font-size:22px;margin:0;">${subject}</h1>
    </div>
    <div style="background:#111111;border:1px solid #1E1E1E;border-radius:12px;padding:24px;color:#ffffff;font-size:14px;line-height:1.6;">
      ${trackedBody.replace(/\n/g, '<br/>')}
    </div>
    <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #1E1E1E;">
      <p style="color:#666;font-size:11px;">
        Sent via UPLY · <a href="${unsubUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
  <img src="${openPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`

            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: `${creatorName} via UPLY <notifications@uply.tv>`,
                to: [recipient.email],
                subject,
                html: emailHtml,
              }),
            })

            if (res.ok) {
              delivered++
            } else {
              failed++
              console.error(`Failed to send to ${recipient.email}:`, await res.text())
            }
          } catch (err) {
            failed++
            console.error(`Error sending to ${recipient.email}:`, err)
          }
        })
      )

      // Small delay between batches
      if (i + 10 < validRecipients.length) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    // Update broadcast record with tracking counts
    const { count: openCount } = await supabase
      .from('broadcast_tracking_events')
      .select('*', { count: 'exact', head: true })
      .eq('broadcast_id', broadcastId)
      .eq('event_type', 'open')

    const { count: clickCount } = await supabase
      .from('broadcast_tracking_events')
      .select('*', { count: 'exact', head: true })
      .eq('broadcast_id', broadcastId)
      .eq('event_type', 'click')

    await supabase
      .from('email_broadcasts')
      .update({
        status: failed === validRecipients.length ? 'failed' : 'sent',
        sent_at: new Date().toISOString(),
        delivered_count: delivered,
        failed_count: failed,
        total_recipients: validRecipients.length,
        open_count: openCount || 0,
        click_count: clickCount || 0,
      })
      .eq('id', broadcastId)

    return new Response(
      JSON.stringify({ delivered, failed, total: validRecipients.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Broadcast error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
