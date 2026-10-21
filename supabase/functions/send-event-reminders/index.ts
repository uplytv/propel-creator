const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { requireInternal, withCors } from "../_shared/security.ts";

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendKey = Deno.env.get('RESEND_API_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Find events starting in ~1 hour
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const fiftyMinFromNow = new Date(now.getTime() + 50 * 60 * 1000)

    const { data: events } = await supabase
      .from('events')
      .select('id, title, starts_at, creator_id')
      .gte('starts_at', fiftyMinFromNow.toISOString())
      .lte('starts_at', oneHourFromNow.toISOString())
      .eq('status', 'published')

    if (!events?.length) {
      return new Response(JSON.stringify({ message: 'No events starting soon' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let totalSent = 0

    for (const event of events) {
      // Get RSVPs that haven't been reminded
      const { data: rsvps } = await supabase
        .from('event_rsvps')
        .select('id, email, name')
        .eq('event_id', event.id)
        .eq('reminder_sent', false)

      if (!rsvps?.length) continue

      // Get creator name
      const { data: creator } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', event.creator_id)
        .single()

      const creatorName = creator?.display_name || 'Creator'
      const eventDate = new Date(event.starts_at).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
      })

      for (const rsvp of rsvps) {
        try {
          const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);border-radius:16px;padding:24px;margin-bottom:20px;">
      <h1 style="color:white;font-size:22px;margin:0 0 8px;">⏰ Starting in 1 hour!</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">${event.title}</p>
    </div>
    <div style="background:#111111;border:1px solid #1E1E1E;border-radius:12px;padding:24px;color:#ffffff;font-size:14px;line-height:1.6;">
      <p>${rsvp.name ? `Hey ${rsvp.name},` : 'Hey there,'}</p>
      <p><strong>${event.title}</strong> by ${creatorName} starts in about 1 hour!</p>
      <p><strong>📅</strong> ${eventDate}</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://uply.tv/event/rsvp/${event.id}" style="display:inline-block;background:#00FF85;color:#0A0A0A;padding:12px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
          Join Now →
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#666;font-size:11px;">Sent via UPLY</p>
    </div>
  </div>
</body>
</html>`

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `UPLY Events <notifications@uply.tv>`,
              to: [rsvp.email],
              subject: `⏰ ${event.title} starts in 1 hour!`,
              html,
            }),
          })

          // Mark as reminded
          await supabase
            .from('event_rsvps')
            .update({ reminder_sent: true })
            .eq('id', rsvp.id)

          totalSent++
        } catch (err) {
          console.error(`Reminder failed for ${rsvp.email}:`, err)
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: totalSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Reminder error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}))
