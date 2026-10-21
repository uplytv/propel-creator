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

    // Get all active enrollments that need processing
    const { data: enrollments } = await supabase
      .from('drip_sequence_enrollments')
      .select(`
        id, sequence_id, subscriber_email, current_step, last_step_sent_at, enrolled_at,
        drip_sequences!inner(id, creator_id, name, status)
      `)
      .eq('status', 'active')
      .eq('drip_sequences.status', 'active')

    if (!enrollments?.length) {
      return new Response(JSON.stringify({ message: 'No enrollments to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let sent = 0
    let completed = 0

    for (const enrollment of enrollments) {
      const sequence = (enrollment as any).drip_sequences
      const nextStepNumber = enrollment.current_step + 1

      // Get the next step
      const { data: step } = await supabase
        .from('drip_sequence_steps')
        .select('*')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_number', nextStepNumber)
        .single()

      if (!step) {
        await supabase.from('drip_sequence_enrollments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', enrollment.id)
        completed++
        continue
      }

      // Check delay
      const referenceTime = enrollment.last_step_sent_at || enrollment.enrolled_at
      const hoursSince = (Date.now() - new Date(referenceTime).getTime()) / (1000 * 60 * 60)
      if (hoursSince < step.delay_hours) continue

      // Check suppression
      const { data: suppressed } = await supabase
        .from('suppressed_emails')
        .select('email')
        .eq('email', enrollment.subscriber_email)
        .single()

      if (suppressed) {
        await supabase.from('drip_sequence_enrollments')
          .update({ status: 'cancelled' })
          .eq('id', enrollment.id)
        continue
      }

      // Check unsubscribed
      const { data: unsubbed } = await supabase
        .from('subscribers')
        .select('unsubscribed, tags, total_opens, total_clicks')
        .eq('email', enrollment.subscriber_email)
        .eq('creator_id', sequence.creator_id)
        .single()

      if (unsubbed?.unsubscribed) {
        await supabase.from('drip_sequence_enrollments')
          .update({ status: 'cancelled' })
          .eq('id', enrollment.id)
        continue
      }

      // Handle branching conditions
      if (step.condition_type) {
        let conditionMet = false

        if (step.condition_type === 'opened_previous') {
          // Check if subscriber opened any email from this sequence
          const { count } = await supabase
            .from('broadcast_tracking_events')
            .select('*', { count: 'exact', head: true })
            .eq('subscriber_email', enrollment.subscriber_email)
            .eq('event_type', 'open')
          conditionMet = (count || 0) > 0
        } else if (step.condition_type === 'clicked_previous') {
          const { count } = await supabase
            .from('broadcast_tracking_events')
            .select('*', { count: 'exact', head: true })
            .eq('subscriber_email', enrollment.subscriber_email)
            .eq('event_type', 'click')
          conditionMet = (count || 0) > 0
        } else if (step.condition_type === 'has_tag') {
          const subTags = unsubbed?.tags || []
          conditionMet = subTags.includes(step.condition_value)
        }

        // Jump to the appropriate step based on condition
        const jumpToStep = conditionMet ? step.on_true_step : step.on_false_step
        if (jumpToStep && jumpToStep !== nextStepNumber) {
          await supabase.from('drip_sequence_enrollments')
            .update({
              current_step: jumpToStep - 1, // will be incremented on next process
              last_step_sent_at: new Date().toISOString(),
            })
            .eq('id', enrollment.id)
          continue
        }
      }

      // Get creator profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', sequence.creator_id)
        .single()

      const creatorName = profile?.display_name || 'Creator'
      const unsubUrl = `https://uply.tv/unsubscribe?email=${encodeURIComponent(enrollment.subscriber_email)}`

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#6366f1,#3b82f6);border-radius:16px;padding:24px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        ${profile?.avatar_url ? `<img src="${profile.avatar_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />` : ''}
        <span style="color:white;font-weight:bold;font-size:16px;">${creatorName}</span>
      </div>
      <h1 style="color:white;font-size:22px;margin:0;">${step.subject}</h1>
    </div>
    <div style="background:#111111;border:1px solid #1E1E1E;border-radius:12px;padding:24px;color:#ffffff;font-size:14px;line-height:1.6;">
      ${step.body.replace(/\n/g, '<br/>')}
    </div>
    <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #1E1E1E;">
      <p style="color:#666;font-size:11px;">
        Sent via UPLY · <a href="${unsubUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a>
      </p>
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
          to: [enrollment.subscriber_email],
          subject: step.subject,
          html: emailHtml,
        }),
      })

      const sendStatus = res.ok ? 'sent' : 'failed'

      await supabase.from('drip_sequence_sends').insert({
        enrollment_id: enrollment.id,
        step_id: step.id,
        status: sendStatus,
      })

      await supabase.from('drip_sequence_enrollments')
        .update({
          current_step: nextStepNumber,
          last_step_sent_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id)

      if (res.ok) sent++
    }

    return new Response(JSON.stringify({ sent, completed, total: enrollments.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('process-drip-sequences error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}))
