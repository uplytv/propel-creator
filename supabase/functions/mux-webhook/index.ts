import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyMuxSignature(req: Request, body: string): Promise<boolean> {
  const secret = Deno.env.get('MUX_WEBHOOK_SECRET')
  if (!secret) {
    console.warn('MUX_WEBHOOK_SECRET not set — skipping signature verification')
    return true
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
            await supabase.from('mux_assets').insert({
              user_id: stream.user_id,
              mux_asset_id: data.id,
              mux_playback_id: playbackId,
              duration: data.duration,
              aspect_ratio: data.aspect_ratio,
              status: 'ready',
              is_public: true,
              title: stream.title ? `${stream.title} (Recording)` : 'Live Stream Recording',
              description: stream.description,
            })

            await supabase.from('live_stream_sessions').insert({
              stream_id: stream.id,
              user_id: stream.user_id,
              mux_asset_id: data.id,
              started_at: new Date().toISOString(),
            })

            console.log(`Saved live stream recording for user ${stream.user_id}, asset ${data.id}`)
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
            console.log(`Updated asset ${updateResult[0].id} to ready via upload_id ${data.upload_id}`)
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
        // FIX 5: Extract and store playback_id when stream goes active
        const activePlaybackId = data.playback_ids?.[0]?.id
        console.log(`🔴 Stream going ACTIVE: mux_stream_id=${data.id}, playback_id=${activePlaybackId}`)
        
        const updatePayload: Record<string, any> = {
          status: 'active',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        
        // Store the playback_id from the active event to ensure it's always current
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
        else console.log(`Stream ${idleResult[0].id} set to idle`)
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
})
