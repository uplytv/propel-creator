import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyMuxSignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('MUX_WEBHOOK_SECRET')
  if (!secret) {
    // SECURITY (batch 1): fail CLOSED. An unset secret must never mean "trust everyone".
    console.error('MUX_WEBHOOK_SECRET not set — rejecting webhook')
    return false
  }

  const header = req.headers.get('mux-signature')
  if (!header) {
    console.error('Missing mux-signature header')
    return false
  }

  const parts: Record<string, string> = {}
  for (const part of header.split(',')) {
    const [key, value] = part.split('=')
    parts[key] = value
  }

  const timestamp = parts['t']
  const expectedSignature = parts['v1']

  if (!timestamp || !expectedSignature) {
    console.error('Invalid mux-signature format')
    return false
  }

  const fiveMinutes = 5 * 60
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > fiveMinutes) {
    console.error('Webhook timestamp too old — possible replay attack')
    return false
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`))
  const computedSignature = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  if (computedSignature !== expectedSignature) {
    console.error('Signature mismatch — rejecting webhook')
    return false
  }

  return true
}

function buildStreamRecordingEmailHtml(title: string, videoUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">
    <div style="height:4px;background-color:#00FF85;"></div>
    <div style="padding:32px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:40px;margin-bottom:8px;">🎬</div>
        <h1 style="color:#FFFFFF;font-size:22px;font-weight:700;margin:0 0 8px;">Your Stream Has Been Saved</h1>
        <p style="color:#888888;font-size:14px;margin:0;">Your full stream recording is ready to watch, share, and publish.</p>
      </div>
      <div style="background:#111111;border:1px solid #1E1E1E;border-radius:12px;padding:20px;margin:20px 0;">
        <div style="color:#888888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Recording Title</div>
        <div style="color:#FFFFFF;font-size:16px;font-weight:600;">${title}</div>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${videoUrl}" style="display:inline-block;background-color:#00FF85;color:#0A0A0A;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;">Watch Recording →</a>
      </div>
      <p style="color:#666666;font-size:13px;text-align:center;margin:0;">You can also add this recording to your classroom or share it with your community.</p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #1E1E1E;text-align:center;">
      <p style="color:#555;font-size:11px;margin:0;">Powered by UPLY</p>
    </div>
  </div>
</body>
</html>`
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Health check — GET /mux-webhook returns 200 so Mux can verify the endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, service: 'mux-webhook', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const rawBody = await req.text()

    const isValid = await verifyMuxSignature(req, rawBody)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = JSON.parse(rawBody)
    const { type, data } = body

    console.log(`Webhook received: ${type}`, JSON.stringify(data).slice(0, 500))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    switch (type) {
      case 'video.asset.ready': {
        const playbackId = data.playback_ids?.[0]?.id
        const liveStreamId = data.live_stream_id

        if (liveStreamId) {
          const { data: stream } = await supabase
            .from('mux_live_streams')
            .select('id, user_id, title, description, category')
            .eq('mux_stream_id', liveStreamId)
            .single()

          if (stream) {
            const recordingTitle = stream.title
              ? `${stream.title} (Recording)`
              : `Stream ${new Date().toLocaleDateString()}`

            await supabase.from('mux_assets').insert({
              user_id: stream.user_id,
              mux_asset_id: data.id,
              mux_playback_id: playbackId,
              duration: data.duration,
              aspect_ratio: data.aspect_ratio,
              status: 'ready',
              is_public: true,
              title: recordingTitle,
              description: stream.description,
            })

            // Fetch download URL from Mux
            let downloadUrl: string | null = null
            try {
              const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
              const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')
              if (muxTokenId && muxTokenSecret) {
                const muxResp = await fetch(`https://api.mux.com/video/v1/assets/${data.id}`, {
                  headers: {
                    'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
                  },
                })
                if (muxResp.ok) {
                  const muxData = await muxResp.json()
                  const mp4 = muxData?.data?.static_renditions?.files?.[0]
                  if (mp4) {
                    downloadUrl = `https://stream.mux.com/${playbackId}/${mp4.name}`
                  }
                }
              }
            } catch (dlErr) {
              console.error('Failed to fetch Mux download URL:', dlErr)
            }

            // Create stream_recordings entry (auto-save)
            const { data: recording, error: recError } = await supabase.from('stream_recordings').insert({
              creator_id: stream.user_id,
              title: recordingTitle,
              description: stream.description || '',
              mux_asset_id: data.id,
              playback_id: playbackId,
              duration_seconds: Math.round(data.duration || 0),
              is_published: true,
              is_free: true,
              download_url: downloadUrl,
            }).select('id, slug').single()

            if (recError) {
              console.error('❌ Failed to insert stream_recording:', JSON.stringify(recError))
            } else {
              console.log(`✅ Stream recording inserted: ${recording?.id}, slug: ${recording?.slug}`)

              // Auto-trigger ARIA Content Engine
              try {
                const ariaUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/aria-process-content`
                await fetch(ariaUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
                  body: JSON.stringify({ source_type: 'stream_recording', source_id: recording?.id, creator_id: stream.user_id }),
                })
                console.log('✅ ARIA Content Engine triggered for recording:', recording?.id)
              } catch (ariaErr) { console.error('ARIA trigger failed (non-blocking):', ariaErr) }
            }

            // Fire n8n distribution webhook (non-blocking)
            try {
              const n8nUrl = Deno.env.get('N8N_WEBHOOK_URL')
              if (n8nUrl && recording?.id) {
                await fetch(n8nUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event: 'recording.ready',
                    recording_id: recording.id,
                    creator_id: stream.user_id,
                    title: recordingTitle,
                    playback_id: playbackId,
                    download_url: downloadUrl,
                    mux_asset_id: data.id,
                    duration_seconds: Math.round(data.duration || 0),
                    stream_id: stream.id,
                    timestamp: new Date().toISOString(),
                  }),
                }).catch(() => {})
              }
            } catch (n8nErr) { console.error('n8n trigger failed (non-blocking):', n8nErr) }

            const sessionTimestamp = new Date().toISOString()
            const { data: latestSession } = await supabase
              .from('live_stream_sessions')
              .select('id')
              .eq('stream_id', stream.id)
              .order('started_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (latestSession?.id) {
              const { error: sessionUpdateError } = await supabase
                .from('live_stream_sessions')
                .update({
                  mux_asset_id: data.id,
                  ended_at: sessionTimestamp,
                })
                .eq('id', latestSession.id)

              if (sessionUpdateError) {
                console.error('❌ Failed to link recording to live_stream_session:', JSON.stringify(sessionUpdateError))
              }
            } else {
              await supabase.from('live_stream_sessions').insert({
                stream_id: stream.id,
                user_id: stream.user_id,
                mux_asset_id: data.id,
                started_at: sessionTimestamp,
                ended_at: sessionTimestamp,
              })
            }

            // Get creator profile for SEO URL
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('username, display_name')
              .eq('user_id', stream.user_id)
              .single()

            const creatorUsername = creatorProfile?.username || creatorProfile?.display_name || 'creator'
            const videoSlug = recording?.slug || 'recording'
            const videoLink = `/${encodeURIComponent(creatorUsername)}/videos/${videoSlug}`
            const fullVideoUrl = `https://uply.tv${videoLink}`

            // Send in-platform notification
            await supabase.from('notifications').insert({
              user_id: stream.user_id,
              type: 'stream_recorded',
              title: 'Your stream has been saved',
              message: 'Your full stream recording is ready to watch, share, and publish to your classroom.',
              link: videoLink,
            })

            // Send email notification via queue
            try {
              const { data: { user: authUser } } = await supabase.auth.admin.getUserById(stream.user_id)
              if (authUser?.email) {
                const emailHtml = buildStreamRecordingEmailHtml(recordingTitle, fullVideoUrl)
                const messageId = `stream-recorded-${data.id}-${crypto.randomUUID().slice(0, 8)}`

                // Log pending
                await supabase.from('email_send_log').insert({
                  message_id: messageId,
                  template_name: 'stream_recorded',
                  recipient_email: authUser.email,
                  status: 'pending',
                })

                await supabase.rpc('enqueue_email', {
                  queue_name: 'transactional_emails',
                  payload: {
                    run_id: crypto.randomUUID(),
                    to: authUser.email,
                    from: 'UPLY <noreply@notify.uply.tv>',
                    sender_domain: 'notify.uply.tv',
                    subject: `Your stream recording is ready — ${recordingTitle}`,
                    html: emailHtml,
                    text: `Your stream "${recordingTitle}" has been saved and is ready to watch, share, and publish.\n\nWatch it here: ${fullVideoUrl}`,
                    purpose: 'transactional',
                    label: 'stream_recorded',
                    message_id: messageId,
                    idempotency_key: messageId,
                    queued_at: new Date().toISOString(),
                  },
                })
              }
            } catch (emailErr) {
              console.error('Failed to enqueue recording email:', emailErr)
            }

            console.log(`✅ Auto-saved stream recording for user ${stream.user_id}, asset ${data.id}, slug ${videoSlug}`)
          }
        } else if (data.upload_id) {
          const { data: updateResult, error: updateError } = await supabase.from('mux_assets')
            .update({
              status: 'ready',
              mux_asset_id: data.id,
              mux_playback_id: playbackId,
              duration: data.duration,
              aspect_ratio: data.aspect_ratio,
              updated_at: new Date().toISOString()
            })
            .eq('upload_id', data.upload_id)
            .select()

          if (updateError) {
            console.error(`Failed to update asset by upload_id ${data.upload_id}: ${JSON.stringify(updateError)}`)
          } else if (!updateResult || updateResult.length === 0) {
            console.warn(`No DB record found for upload_id ${data.upload_id} — asset ${data.id} with playback ${playbackId} was not linked`)
          } else {
            const asset = updateResult[0]
            console.log(`Updated asset ${asset.id} to ready via upload_id ${data.upload_id}`)

            // If this is a browser-recorded stream (title contains "(Recording)"),
            // also create a stream_recordings row so it shows in the recordings library.
            const isStreamRecording = (asset.title || '').includes('(Recording)')
            if (isStreamRecording) {
              try {
                const { data: existing } = await supabase
                  .from('stream_recordings')
                  .select('id')
                  .eq('mux_asset_id', data.id)
                  .maybeSingle()

                if (!existing) {
                  const { data: rec, error: recErr } = await supabase.from('stream_recordings').insert({
                    creator_id: asset.user_id,
                    title: asset.title,
                    description: asset.description || '',
                    mux_asset_id: data.id,
                    playback_id: playbackId,
                    duration_seconds: Math.round(data.duration || 0),
                    is_published: true,
                    is_free: true,
                  }).select('id').single()

                  if (recErr) console.error('Failed to create stream_recording from browser upload:', recErr)
                  else console.log(`✅ Auto-created stream_recording ${rec?.id} from browser upload ${asset.id}`)
                }
              } catch (e) {
                console.error('stream_recording auto-create failed:', e)
              }
            }

            // Fire n8n distribution webhook for uploaded videos (non-blocking)
            try {
              const n8nUrl = Deno.env.get('N8N_WEBHOOK_URL')
              if (n8nUrl) {
                await fetch(n8nUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event: 'video.ready',
                    asset_id: asset.id,
                    creator_id: asset.user_id,
                    mux_asset_id: data.id,
                    playback_id: playbackId,
                    timestamp: new Date().toISOString(),
                  }),
                }).catch(() => {})
              }
            } catch (n8nErr) { console.error('n8n trigger failed (non-blocking):', n8nErr) }
          }
        }
        break
      }

      case 'video.asset.errored':
        if (data.upload_id) {
          await supabase.from('mux_assets')
            .update({ status: 'errored', updated_at: new Date().toISOString() })
            .eq('upload_id', data.upload_id)
        }
        break

      case 'video.live_stream.active': {
        const activePlaybackId = data.playback_ids?.[0]?.id
        console.log(`🔴 Stream going ACTIVE: mux_stream_id=${data.id}, playback_id=${activePlaybackId}`)
        
        const updatePayload: Record<string, any> = {
          status: 'active',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        
        if (activePlaybackId) {
          updatePayload.mux_playback_id = activePlaybackId
        }
        
        const { data: activeResult, error: activeErr } = await supabase.from('mux_live_streams')
          .update(updatePayload)
          .eq('mux_stream_id', data.id)
          .select()
        if (activeErr) console.error('Failed to set stream active:', activeErr)
        else if (!activeResult?.length) console.warn(`No row found for mux_stream_id=${data.id} — stream not tracked`)
        else console.log(`Stream ${activeResult[0].id} set to active with playback_id=${activePlaybackId}`)
        break
      }

      case 'video.live_stream.idle': {
        console.log(`⚪ Stream going IDLE: mux_stream_id=${data.id}`)
        const { data: idleResult, error: idleErr } = await supabase.from('mux_live_streams')
          .update({
            status: 'idle',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('mux_stream_id', data.id)
          .select()
        if (idleErr) console.error('Failed to set stream idle:', idleErr)
        else if (!idleResult?.length) console.warn(`No row found for mux_stream_id=${data.id}`)
        else {
          console.log(`Stream ${idleResult[0].id} set to idle`)
          
          // Trigger auto-shorts generation
          try {
            const funcUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-shorts`
            const shortsResp = await fetch(funcUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                stream_id: idleResult[0].id,
                mux_stream_id: data.id,
                user_id: idleResult[0].user_id,
              }),
            })
            console.log(`Auto-shorts trigger response: ${shortsResp.status}`)
          } catch (shortsErr) {
            console.error('Failed to trigger auto-shorts:', shortsErr)
          }
        }
        break
      }

      case 'video.asset.deleted': {
        await supabase.from('mux_assets')
          .update({ status: 'deleted', updated_at: new Date().toISOString() })
          .eq('mux_asset_id', data.id)
        console.log(`Asset deleted: ${data.id}`)
        break
      }

      case 'video.live_stream.disconnected': {
        console.log(`Stream disconnected (reconnect window open): mux_stream_id=${data.id}`)
        await supabase.from('mux_live_streams')
          .update({ status: 'reconnecting', updated_at: new Date().toISOString() })
          .eq('mux_stream_id', data.id)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}))