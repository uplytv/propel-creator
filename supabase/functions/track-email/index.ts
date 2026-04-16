import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

// 1x1 transparent GIF pixel
const PIXEL = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0))

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const broadcastId = url.searchParams.get('bid')
  const email = url.searchParams.get('e')
  const eventType = url.searchParams.get('t') || 'open' // open or click
  const linkUrl = url.searchParams.get('url')
  const userAgent = req.headers.get('user-agent') || null

  if (!broadcastId || !email) {
    // Still return pixel for opens so email renders properly
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

    // Record tracking event
    await supabase.from('broadcast_tracking_events').insert({
      broadcast_id: broadcastId,
      subscriber_email: decodeURIComponent(email),
      event_type: eventType,
      link_url: linkUrl ? decodeURIComponent(linkUrl) : null,
      user_agent: userAgent,
    })

    // Update aggregate counts on broadcast
    if (eventType === 'open') {
      await supabase.rpc('increment_broadcast_open', { bid: broadcastId }).catch(() => {
        // Fallback: direct update
        return supabase.from('email_broadcasts')
          .update({ open_count: supabase.rpc ? undefined : 1 })
          .eq('id', broadcastId)
      })
    } else if (eventType === 'click') {
      // Just record, click_count updated via count query
    }

    // For clicks, redirect to the actual URL
    if (eventType === 'click' && linkUrl) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': decodeURIComponent(linkUrl) },
      })
    }

    // For opens, return tracking pixel
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
