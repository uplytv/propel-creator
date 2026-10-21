import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { blast_id, creator_id, space_id, subject, message, media_type, media_url, mux_playback_id, mux_asset_id } = await req.json()

    if (!creator_id || !space_id || !subject || !message) {
      throw new Error('Missing required fields')
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // AuthN: caller JWT must match creator_id (or service-role for internal calls)
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (token !== SERVICE_KEY) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!)
      const { data: { user }, error: authErr } = await userClient.auth.getUser(token)
      if (authErr || !user || user.id !== creator_id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // Rate limit check - enforce 3 day cooldown server-side
    const { data: spaceData, error: spaceErr } = await supabase
      .from('creator_spaces')
      .select('last_blast_sent_at, name')
      .eq('creator_id', creator_id)
      .single()

    if (spaceErr) throw new Error('Could not find creator space')

    if (spaceData.last_blast_sent_at) {
      const lastSent = new Date(spaceData.last_blast_sent_at)
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000
      if (Date.now() - lastSent.getTime() < threeDaysMs) {
        return new Response(JSON.stringify({ error: 'Rate limited. You can only send one blast every 3 days.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Fetch creator profile for email template
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, username')
      .eq('user_id', creator_id)
      .single()

    const creatorName = creatorProfile?.display_name || 'A creator'
    const creatorAvatar = creatorProfile?.avatar_url || ''
    const spaceName = spaceData.name || creatorName + "'s Community"
    const creatorUsername = creatorProfile?.username || creator_id

    const spaceUrl = `https://uply.tv/${encodeURIComponent(creatorUsername)}/community`

    // Fetch eligible members
    const { data: members, error: membersErr } = await supabase
      .from('community_members')
      .select('user_id, email_opt_in')
      .eq('creator_id', creator_id)
      .eq('email_opt_in', true)

    if (membersErr) throw new Error('Failed to fetch members: ' + membersErr.message)

    const eligibleMembers = (members || []).filter((m: any) => m.user_id !== creator_id)

    // Get user emails via auth admin
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = new Map<string, string>()
    for (const u of (authUsers?.users || [])) {
      if (u.email) emailMap.set(u.id, u.email)
    }

    let successCount = 0

    // Build email HTML
    const buildEmailHtml = (unsubUrl: string) => {
      const mediaBlock = media_type === 'image' && media_url
        ? `<img src="${media_url}" alt="" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin:20px 0;" />`
        : media_type === 'video' && mux_playback_id
        ? `<a href="${spaceUrl}" style="display:block;text-decoration:none;margin:20px 0;">
            <div style="position:relative;width:100%;border-radius:8px;overflow:hidden;">
              <img src="https://image.mux.com/${mux_playback_id}/thumbnail.jpg" alt="" style="width:100%;display:block;border-radius:8px;" />
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:rgba(0,255,133,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;">
                <div style="width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:20px solid #0A0A0A;margin-left:4px;"></div>
              </div>
            </div>
            <p style="text-align:center;color:#888;font-size:13px;margin-top:8px;">▶ Watch the full video on UPLY</p>
          </a>`
        : ''

      // Process message: convert bold/italic markdown, preserve newlines
      const formattedMessage = message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>')

      return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">
    <div style="height:4px;background-color:#00FF85;"></div>
    <div style="padding:32px 28px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        ${creatorAvatar ? `<img src="${creatorAvatar}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" />` : ''}
        <div>
          <div style="color:#FFFFFF;font-size:16px;font-weight:700;">${creatorName}</div>
          <div style="color:#888888;font-size:13px;">sent you a message</div>
        </div>
      </div>
      <h1 style="color:#FFFFFF;font-size:24px;font-weight:700;margin:0 0 16px;line-height:1.3;">${subject}</h1>
      <div style="color:#CCCCCC;font-size:16px;line-height:1.6;margin:0 0 20px;">${formattedMessage}</div>
      ${mediaBlock}
      <div style="text-align:center;margin:28px 0;">
        <a href="${spaceUrl}" style="display:inline-block;background-color:#00FF85;color:#0A0A0A;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">View in Community →</a>
      </div>
    </div>
    <div style="padding:20px 28px;border-top:1px solid #1E1E1E;">
      <p style="color:#666;font-size:12px;line-height:1.5;margin:0;">You're receiving this because you're a member of ${creatorName}'s community on UPLY.</p>
      <p style="margin:8px 0 0;"><a href="${unsubUrl}" style="color:#888;font-size:12px;text-decoration:underline;">Unsubscribe from blast emails</a></p>
    </div>
  </div>
</body>
</html>`
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    // Process each member
    for (const member of eligibleMembers) {
      try {
        const email = emailMap.get(member.user_id)

        // 1. Insert in-platform notification
        await supabase.from('notifications').insert({
          user_id: member.user_id,
          type: 'community_blast',
          title: subject,
          message: message.substring(0, 160),
          actor_id: creator_id,
          reference_id: blast_id,
          link: spaceUrl,
        })

        // 2. Enqueue email if we have their email
        if (email) {
          // Generate unsubscribe token
          const unsubToken = crypto.randomUUID()
          await supabase.from('email_unsubscribe_tokens').insert({
            email,
            token: unsubToken,
          })

          const unsubUrl = `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${unsubToken}&type=community_blast`
          const emailHtml = buildEmailHtml(unsubUrl)

          const messageId = `blast-${blast_id}-${member.user_id}`
          
          // Log pending
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'community_blast',
            recipient_email: email,
            status: 'pending',
          })

          // Enqueue via pgmq with all required fields
          await supabase.rpc('enqueue_email', {
            queue_name: 'transactional_emails',
            payload: {
              run_id: crypto.randomUUID(),
              to: email,
              from: `${creatorName} via UPLY <noreply@notify.uply.tv>`,
              sender_domain: 'notify.uply.tv',
              subject: `${creatorName}: ${subject}`,
              html: emailHtml,
              text: `${creatorName}: ${subject}\n\n${message}\n\nView in community: ${spaceUrl}`,
              purpose: 'transactional',
              label: 'community_blast',
              message_id: messageId,
              idempotency_key: messageId,
              queued_at: new Date().toISOString(),
            },
          })

          // Update last_emailed_at
          await supabase
            .from('community_members')
            .update({ last_emailed_at: new Date().toISOString() })
            .eq('creator_id', creator_id)
            .eq('user_id', member.user_id)
        }

        successCount++
      } catch (err) {
        console.error(`Failed to process member ${member.user_id}:`, err)
        // Continue with other members
      }
    }

    // Update blast record
    if (blast_id) {
      await supabase
        .from('community_blasts')
        .update({
          status: 'sent',
          recipient_count: successCount,
          sent_at: new Date().toISOString(),
        })
        .eq('id', blast_id)
    }

    // Update last_blast_sent_at
    await supabase
      .from('creator_spaces')
      .update({ last_blast_sent_at: new Date().toISOString() })
      .eq('creator_id', creator_id)

    return new Response(JSON.stringify({ success: true, recipient_count: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('send-community-blast error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}))