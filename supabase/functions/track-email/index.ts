import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

// 1x1 transparent GIF pixel
const PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0))

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const broadcastId = url.searchParams.get('bid')
  const email = url.searchParams.get('e')
  const eventType = url.searchParams.get('t') || 'open'
  const linkUrl = url.searchParams.get('url')
  const userAgent = req.headers.get('user-agent') || null

  if (!broadcastId || !email) {
    if (eventType === 'open') {
      return new Response(PIXEL, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
    }
    return new Response('missing params', { status: 400 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const decodedEmail = decodeURIComponent(email)

    // Record tracking event
    await supabase.from('broadcast_tracking_events').insert({
      broadcast_id: broadcastId,
      subscriber_email: decodedEmail,
      event_type: eventType,
      link_url: linkUrl ? decodeURIComponent(linkUrl) : null,
      user_agent: userAgent,
    })

    // Update aggregate counts on broadcast
    if (eventType === 'open') {
      const { count } = await supabase
        .from('broadcast_tracking_events')
        .select('*', { count: 'exact', head: true })
        .eq('broadcast_id', broadcastId)
        .eq('event_type', 'open')
      
      await supabase.from('email_broadcasts')
        .update({ open_count: count || 0 })
        .eq('id', broadcastId)

      // Increment subscriber's total_opens and recalc lead score
      await supabase.rpc('increment_subscriber_engagement', {
        p_email: decodedEmail,
        p_field: 'total_opens'
      }).catch(() => {})

      // Track open hour for smart send-time optimization
      const openHour = new Date().getUTCHours()
      await supabase.rpc('update_subscriber_send_hour', {
        p_email: decodedEmail,
        p_hour: openHour
      }).catch(() => {})
    } else if (eventType === 'click') {
      const { count } = await supabase
        .from('broadcast_tracking_events')
        .select('*', { count: 'exact', head: true })
        .eq('broadcast_id', broadcastId)
        .eq('event_type', 'click')
      
      await supabase.from('email_broadcasts')
        .update({ click_count: count || 0 })
        .eq('id', broadcastId)

      // Increment subscriber's total_clicks
      await supabase.rpc('increment_subscriber_engagement', {
        p_email: decodedEmail,
        p_field: 'total_clicks'
      }).catch(() => {})
    }

    // For clicks, redirect to the actual URL
    if (eventType === 'click' && linkUrl) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': decodeURIComponent(linkUrl) },
      })
    }

    return new Response(PIXEL, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('Track error:', err)
    if (eventType === 'open') {
      return new Response(PIXEL, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
    }
    if (eventType === 'click' && linkUrl) {
      return new Response(null, { status: 302, headers: { 'Location': decodeURIComponent(linkUrl) } })
    }
    return new Response('error', { status: 500 })
  }
})
