const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { serviceClient, strictRateLimit, withCors } from '../_shared/security.ts'
import { requestIp } from '../_shared/rateLimit.ts'

const esc = (v: unknown) => String(v ?? '').slice(0, 200).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const body = await req.json()
    const recipientEmail = String(body?.recipientEmail ?? '').trim().toLowerCase()
    const eventId = body?.eventId

    if (!recipientEmail || !eventId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // SECURITY: this public endpoint used to email any address with any content
    // (spam relay). Now: rate limited (fails closed), only for a real RSVP row,
    // and event title / creator come from the database, not the request.
    const svc = serviceClient()
    const ipOk = await strictRateLimit(svc, `ip:${requestIp(req)}`, 'send-rsvp-email', 5, 10 * 60_000)
    const emailOk = ipOk && await strictRateLimit(svc, `email:${recipientEmail}`, 'send-rsvp-email', 3, 24 * 60 * 60_000)
    if (!ipOk || !emailOk) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: rsvp } = await svc.from('event_rsvps').select('id').eq('event_id', eventId).eq('email', recipientEmail).maybeSingle()
    if (!rsvp) {
      return new Response(JSON.stringify({ error: 'RSVP not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: ev } = await svc.from('events').select('title, creator_id').eq('id', eventId).maybeSingle()
    if (!ev) {
      return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: creatorProfile } = ev.creator_id
      ? await svc.from('profiles').select('display_name').eq('user_id', ev.creator_id).maybeSingle()
      : { data: null }
    const eventTitle = esc(ev.title)
    const creatorName = esc(creatorProfile?.display_name || 'Creator').replace(/[<>@"]/g, '')
    const recipientName = body?.recipientName ? esc(body.recipientName) : ''
    const eventDate = esc(body?.eventDate || 'TBD')

    const joinLink = `https://uply.tv/event/rsvp/${eventId}`
    const greeting = recipientName ? `Hey ${recipientName},` : 'Hey there,'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#6366f1,#3b82f6);border-radius:16px;padding:24px;margin-bottom:20px;">
      <h1 style="color:white;font-size:22px;margin:0 0 8px;">🎉 You're in!</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">RSVP confirmed for ${eventTitle}</p>
    </div>
    <div style="background:#111111;border:1px solid #1E1E1E;border-radius:12px;padding:24px;color:#ffffff;font-size:14px;line-height:1.6;">
      <p>${greeting}</p>
      <p>Your RSVP for <strong>${eventTitle}</strong> by <strong>${creatorName}</strong> is confirmed!</p>
      <p><strong>📅 When:</strong> ${eventDate}</p>
      <p>We'll send you a reminder 1 hour before the event starts.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${joinLink}" style="display:inline-block;background:#00FF85;color:#0A0A0A;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
          View Event Details
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#666;font-size:11px;">Sent via UPLY</p>
    </div>
  </div>
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
        to: [recipientEmail],
        subject: `🎉 RSVP Confirmed: ${eventTitle}`,
        html,
      }),
    })

    const result = await res.json()

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('RSVP email error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}))
