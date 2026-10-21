import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const resendKey = Deno.env.get('RESEND_API_KEY')!

    // Find A/B parent broadcasts that are sent but winner not yet sent
    const { data: parents } = await supabase
      .from('email_broadcasts')
      .select('*')
      .not('ab_variant_a', 'is', null)
      .not('ab_variant_b', 'is', null)
      .eq('ab_winner_sent', false)
      .in('status', ['sent'])

    if (!parents?.length) {
      return new Response(JSON.stringify({ message: 'No A/B tests to evaluate' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let processed = 0

    for (const parent of parents) {
      // Get child variants
      const { data: variants } = await supabase
        .from('email_broadcasts')
        .select('id, subject, open_count, click_count, total_recipients, sent_at')
        .eq('ab_parent_id', parent.id)
        .order('created_at', { ascending: true })

      if (!variants || variants.length < 2) continue

      // Check if at least 2 hours have passed since sending
      const sentAt = new Date(variants[0].sent_at || parent.sent_at || parent.created_at)
      const hoursSinceSent = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceSent < 2) continue

      // Refresh open/click counts from tracking events
      for (const v of variants) {
        const { count: opens } = await supabase
          .from('broadcast_tracking_events')
          .select('*', { count: 'exact', head: true })
          .eq('broadcast_id', v.id)
          .eq('event_type', 'open')

        const { count: clicks } = await supabase
          .from('broadcast_tracking_events')
          .select('*', { count: 'exact', head: true })
          .eq('broadcast_id', v.id)
          .eq('event_type', 'click')

        v.open_count = opens || 0
        v.click_count = clicks || 0

        await supabase.from('email_broadcasts')
          .update({ open_count: v.open_count, click_count: v.click_count })
          .eq('id', v.id)
      }

      // Determine winner by open rate, fallback to click rate
      const [varA, varB] = variants
      const rateA = varA.total_recipients ? (varA.open_count || 0) / varA.total_recipients : 0
      const rateB = varB.total_recipients ? (varB.open_count || 0) / varB.total_recipients : 0
      const winner = rateA >= rateB ? varA : varB
      const winnerSubject = winner.subject

      // Get all original recipients
      const creatorId = parent.creator_id
      let query = supabase
        .from('subscribers')
        .select('email, name')
        .eq('creator_id', creatorId)
        .eq('unsubscribed', false)

      if (parent.segment === 'members') query = query.eq('source', 'membership')
      else if (parent.segment === 'free') query = query.neq('source', 'membership')
      else if (parent.segment !== 'all') query = query.eq('source', parent.segment)

      const { data: allRecipients } = await query

      // Get emails already sent to in test
      const { data: testRecipients } = await supabase
        .from('broadcast_tracking_events')
        .select('subscriber_email')
        .in('broadcast_id', variants.map(v => v.id))

      const alreadySentSet = new Set((testRecipients || []).map(t => t.subscriber_email))

      // Also check suppression
      const allEmails = (allRecipients || []).map(r => r.email)
      const { data: suppressed } = await supabase
        .from('suppressed_emails')
        .select('email')
        .in('email', allEmails)
      const suppressedSet = new Set((suppressed || []).map(s => s.email))

      // Remaining recipients
      const remaining = (allRecipients || []).filter(
        r => !alreadySentSet.has(r.email) && !suppressedSet.has(r.email)
      )

      if (remaining.length === 0) {
        await supabase.from('email_broadcasts')
          .update({ ab_winner_sent: true })
          .eq('id', parent.id)
        continue
      }

      // Create winner broadcast
      const { data: winnerBroadcast } = await supabase
        .from('email_broadcasts')
        .insert({
          creator_id: creatorId,
          subject: winnerSubject,
          body: parent.body,
          segment: parent.segment,
          status: 'sending',
          total_recipients: remaining.length,
          ab_parent_id: parent.id,
        })
        .select()
        .single()

      if (!winnerBroadcast) continue

      // Get creator info
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', creatorId)
        .single()

      // Send winner to remaining via the broadcast function
      await supabase.functions.invoke('send-email-broadcast', {
        body: {
          broadcastId: winnerBroadcast.id,
          subject: winnerSubject,
          htmlBody: parent.body,
          recipients: remaining.map(r => ({ email: r.email, name: r.name })),
          creatorName: profile?.display_name || 'Creator',
          creatorAvatar: profile?.avatar_url,
        },
      })

      // Mark parent as winner sent
      await supabase.from('email_broadcasts')
        .update({ ab_winner_sent: true })
        .eq('id', parent.id)

      processed++
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('check-ab-winner error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}))
