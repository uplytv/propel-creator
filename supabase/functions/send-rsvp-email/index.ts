const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const { recipientEmail, recipientName, eventTitle, eventDate, creatorName, eventId } = await req.json()

    if (!recipientEmail || !eventTitle) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
})
