// notification-digest — once-daily summary email of unread notifications.
//
// Called by pg_cron ('notification-digest', 20260707040000_levels_digest.sql)
// with the vault-stored service_role key, same precedent as
// process-email-queue. For each user with unread notifications from the last
// 24h it enqueues ONE summary email through the EXISTING email queue
// (public.enqueue_email → pgmq 'transactional_emails' → process-email-queue).
// It never sends directly and never builds a parallel email path.
//
// Opt-out: notification_preferences.daily_digest_email = false (Settings →
// Notifications), plus the platform-wide suppression list
// (is_email_suppressed) and the standard unsubscribe-token footer link.
// Idempotent per day via message_id `notification-digest-<user>-<YYYY-MM-DD>`
// checked against email_send_log before enqueueing.

import { createClient } from 'npm:@supabase/supabase-js@2'

const MAX_USERS_PER_RUN = 200 // cap batch; remaining users catch up next day
const MAX_NOTIFICATION_ROWS = 10000
const MAX_DIGEST_LINES = 10

const APP_URL = 'https://uply.tv'

// Friendly grouping labels per notification type (singular, plural).
// Unknown types fall back to a humanized form of the type string.
const TYPE_LABELS: Record<string, [string, string]> = {
  member_joined: ['new member', 'new members'],
  new_paid_member: ['new member', 'new members'],
  new_subscriber: ['new subscriber', 'new subscribers'],
  subscription_confirmed: ['subscription update', 'subscription updates'],
  sale: ['sale', 'sales'],
  purchase: ['purchase', 'purchases'],
  ticket_sold: ['ticket sale', 'ticket sales'],
  event_ticket_sale: ['ticket sale', 'ticket sales'],
  event_ticket: ['event ticket', 'event tickets'],
  community_comment: ['reply', 'replies'],
  community_reply: ['reply', 'replies'],
  community_like: ['like', 'likes'],
  new_follower: ['new follower', 'new followers'],
  tip_received: ['tip', 'tips'],
  new_message: ['message', 'messages'],
  deal_message: ['deal message', 'deal messages'],
  email_subscriber: ['email subscriber', 'email subscribers'],
  level_up: ['level-up', 'level-ups'],
  booking_inquiry: ['booking inquiry', 'booking inquiries'],
  affiliate_conversion: ['referral conversion', 'referral conversions'],
  brand_application: ['brand deal application', 'brand deal applications'],
  brand_application_accepted: ['brand deal update', 'brand deal updates'],
}

function labelFor(type: string, count: number): string {
  const pair = TYPE_LABELS[type]
  if (pair) return `${count} ${count === 1 ? pair[0] : pair[1]}`
  return `${count} ${type.replace(/_/g, ' ')} update${count === 1 ? '' : 's'}`
}

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = parts[1]
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(atob(payload)) as Record<string, unknown>
  } catch {
    return null
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function buildDigestHtml(opts: {
  displayName: string
  total: number
  lines: string[]
  unsubscribeUrl: string
}): string {
  const rows = opts.lines
    .map(
      (line) => `
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #1a1a1f;">${escapeHtml(line)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f7f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f7fa; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background: linear-gradient(135deg, #3D7CFF, #B025FF); padding: 26px 24px; text-align: center;">
            <div style="font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">Daily Digest</div>
            <div style="font-size: 20px; font-weight: 700; color: #ffffff;">You have ${opts.total} update${opts.total === 1 ? '' : 's'} on UPLY</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 24px 8px;">
            <div style="font-size: 15px; font-weight: 600; color: #1a1a1f; margin-bottom: 6px;">Hey ${escapeHtml(opts.displayName)} 👋</div>
            <div style="font-size: 13px; color: #6b6b76; line-height: 1.6;">Here's what happened since yesterday:</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 24px 4px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 8px; overflow: hidden;">
              ${rows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 24px 24px; text-align: center;">
            <a href="${APP_URL}/notifications" style="display: inline-block; background: linear-gradient(135deg, #3D7CFF, #B025FF); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">View all notifications</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 16px 24px; border-top: 1px solid #f0f0f0; text-align: center;">
            <div style="font-size: 12px; color: #999; margin-bottom: 8px;">You get at most one of these a day, and only when something happened.</div>
            <div style="font-size: 11px;"><a href="${opts.unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe from digest emails</a></div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Same defense-in-depth gate as process-email-queue: verify_jwt = true at
  // the gateway, plus an explicit service_role claim check here.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const claims = parseJwtClaims(authHeader.slice('Bearer '.length).trim())
  if (claims?.role !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const dateKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // 1. Unread notifications from the last 24h.
    const { data: rows, error: notifError } = await supabase
      .from('notifications')
      .select('user_id, type')
      .eq('read', false)
      .gte('created_at', sinceIso)
      .limit(MAX_NOTIFICATION_ROWS)
    if (notifError) throw notifError

    // 2. Group per user, per type.
    const byUser = new Map<string, Map<string, number>>()
    for (const row of rows ?? []) {
      const uid = row.user_id as string
      const type = (row.type as string) || 'update'
      if (!uid) continue
      let typeMap = byUser.get(uid)
      if (!typeMap) {
        typeMap = new Map()
        byUser.set(uid, typeMap)
      }
      typeMap.set(type, (typeMap.get(type) ?? 0) + 1)
    }

    if (byUser.size === 0) {
      return new Response(JSON.stringify({ enqueued: 0, reason: 'no_unread_notifications' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Cap the batch — busiest users first; the rest catch up tomorrow.
    const userIds = [...byUser.entries()]
      .sort((a, b) => {
        const totalA = [...a[1].values()].reduce((s, n) => s + n, 0)
        const totalB = [...b[1].values()].reduce((s, n) => s + n, 0)
        return totalB - totalA
      })
      .slice(0, MAX_USERS_PER_RUN)
      .map(([uid]) => uid)

    // 3. Opt-outs (notification_preferences.daily_digest_email = false).
    const optedOut = new Set<string>()
    const { data: prefRows } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .in('user_id', userIds)
      .eq('daily_digest_email', false)
    for (const p of prefRows ?? []) optedOut.add(p.user_id as string)

    // 4. Already digested today (idempotency across cron retries).
    const candidateMessageIds = userIds.map((uid) => `notification-digest-${uid}-${dateKey}`)
    const alreadyQueued = new Set<string>()
    const { data: logRows } = await supabase
      .from('email_send_log')
      .select('message_id')
      .in('message_id', candidateMessageIds)
    for (const l of logRows ?? []) {
      if (typeof l.message_id === 'string') alreadyQueued.add(l.message_id)
    }

    let enqueued = 0
    let skipped = 0

    for (const uid of userIds) {
      const messageId = `notification-digest-${uid}-${dateKey}`
      if (optedOut.has(uid) || alreadyQueued.has(messageId)) {
        skipped++
        continue
      }

      const typeMap = byUser.get(uid)!
      const total = [...typeMap.values()].reduce((s, n) => s + n, 0)

      // Recipient email lives in auth.users (same precedent as
      // send-creator-lifecycle-emails).
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(uid)
      const email = userData?.user?.email
      if (userError || !email) {
        skipped++
        continue
      }

      // Platform suppression list always wins (bounces/complaints/unsubs).
      const { data: suppressed } = await supabase.rpc('is_email_suppressed', { p_email: email })
      if (suppressed) {
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'notification-digest',
          recipient_email: email,
          status: 'suppressed',
        })
        skipped++
        continue
      }

      // Display name for the greeting.
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', uid)
        .maybeSingle()
      const displayName = profile?.display_name || profile?.username || 'there'

      // Grouped lines, biggest groups first, capped at 10.
      const lines = [...typeMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_DIGEST_LINES)
        .map(([type, count]) => labelFor(type, count))

      // Unsubscribe token — same mechanism as send-weekly-report-email
      // (email_unsubscribe_tokens + handle-email-unsubscribe).
      const { data: existingToken } = await supabase
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', email)
        .is('used_at', null)
        .maybeSingle()
      const token = existingToken?.token || crypto.randomUUID()
      if (!existingToken) {
        await supabase.from('email_unsubscribe_tokens').insert({ email, token })
      }
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}&type=notification_digest`

      const subject = `You have ${total} update${total === 1 ? '' : 's'} on UPLY`
      const summary = `You have ${total} update${total === 1 ? '' : 's'} on UPLY: ${lines.join(', ')}.`
      const html = buildDigestHtml({ displayName, total, lines, unsubscribeUrl })
      const text = `${summary}\n\nSee everything: ${APP_URL}/notifications\n\nUnsubscribe: ${unsubscribeUrl}`

      // Enqueue through the EXISTING queue — exact payload shape used by
      // send-weekly-report-email / stripe-webhook (processed by
      // process-email-queue).
      const { error: enqueueError } = await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          run_id: crypto.randomUUID(),
          to: email,
          from: 'UPLY <noreply@notify.uply.tv>',
          sender_domain: 'notify.uply.tv',
          subject,
          html,
          text,
          purpose: 'transactional',
          label: 'notification-digest',
          message_id: messageId,
          idempotency_key: messageId,
          queued_at: new Date().toISOString(),
        },
      })
      if (enqueueError) {
        console.error('Failed to enqueue digest email', { uid, error: enqueueError })
        skipped++
        continue
      }

      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'notification-digest',
        recipient_email: email,
        status: 'pending',
      })
      enqueued++
    }

    return new Response(
      JSON.stringify({ enqueued, skipped, users_with_unread: byUser.size }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('notification-digest error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
