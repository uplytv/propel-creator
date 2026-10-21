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
    const supabase = createClient(supabaseUrl, serviceKey)

    // Find broadcasts that are scheduled and due
    const { data: dueBroadcasts } = await supabase
      .from('email_broadcasts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())

    if (!dueBroadcasts?.length) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let processed = 0

    for (const broadcast of dueBroadcasts) {
      // Fetch creator profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', broadcast.creator_id)
        .single()

      // Fetch recipients based on segment
      let query = supabase
        .from('subscribers')
        .select('email, name')
        .eq('creator_id', broadcast.creator_id)
        .eq('unsubscribed', false)

      if (broadcast.segment === 'members') query = query.eq('source', 'membership')
      else if (broadcast.segment === 'free') query = query.neq('source', 'membership')
      else if (broadcast.segment !== 'all') query = query.eq('source', broadcast.segment)

      const { data: recipients } = await query

      if (recipients?.length) {
        // Update to sending
        await supabase.from('email_broadcasts')
          .update({ status: 'sending' })
          .eq('id', broadcast.id)

        // Invoke the send function
        await supabase.functions.invoke('send-email-broadcast', {
          body: {
            broadcastId: broadcast.id,
            subject: broadcast.subject,
            htmlBody: broadcast.body,
            recipients: recipients.map(r => ({ email: r.email, name: r.name })),
            creatorName: profile?.display_name || 'Creator',
            creatorAvatar: profile?.avatar_url,
          },
        })

        processed++
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Scheduled broadcast error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}))
