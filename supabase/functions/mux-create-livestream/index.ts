import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let body: any
  try {
    body = await req.json()
  } catch (e) {
    console.error('[mux-create-livestream] body parse failed:', e)
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { userId, title, description, category, isPublic, orientation } = body || {}
  const streamOrientation = orientation === 'portrait' ? 'portrait' : 'landscape'

  if (!userId) {
    console.error('[mux-create-livestream] missing userId in body:', body)
    return new Response(JSON.stringify({ error: 'userId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
  const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')

  if (!muxTokenId || !muxTokenSecret) {
    console.error('[mux-create-livestream] Mux credentials not configured')
    return new Response(JSON.stringify({ error: 'Mux API credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Build Mux payload — keep it minimal and valid.
  // Recording is automatic when new_asset_settings is present.
  const muxPayload = {
    playback_policy: ['public'],
    new_asset_settings: {
      playback_policy: ['public'],
      mp4_support: 'capped-1080p',
      normalize_audio: true,
    },
    reconnect_window: 300,
    max_continuous_duration: 43200, // 12h — Mux max is 12h, 86400 was invalid
    latency_mode: 'reduced',
    passthrough: JSON.stringify({ userId, orientation: streamOrientation }),
  }

  let muxData: any
  try {
    const muxResponse = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`,
      },
      body: JSON.stringify(muxPayload),
    })

    if (!muxResponse.ok) {
      const errText = await muxResponse.text()
      console.error('[mux-create-livestream] Mux API error', {
        status: muxResponse.status,
        body: errText,
        sentPayload: muxPayload,
      })
      return new Response(
        JSON.stringify({
          error: `Mux API error (${muxResponse.status}): ${errText}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    muxData = await muxResponse.json()
  } catch (e: any) {
    console.error('[mux-create-livestream] Mux fetch threw:', e?.message || e)
    return new Response(JSON.stringify({ error: `Mux request failed: ${e?.message || e}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: stream, error: dbError } = await supabase
    .from('mux_live_streams')
    .insert({
      user_id: userId,
      mux_stream_id: muxData.data.id,
      mux_playback_id: muxData.data.playback_ids[0].id,
      stream_key: muxData.data.stream_key,
      title,
      description,
      category,
      is_public: isPublic,
      status: 'idle',
      orientation: streamOrientation,
    })
    .select()
    .single()

  if (dbError) {
    console.error('[mux-create-livestream] DB insert failed:', dbError)
    return new Response(JSON.stringify({ error: `DB insert failed: ${dbError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: sessionError } = await supabase.from('live_stream_sessions').insert({
    stream_id: stream.id,
    user_id: userId,
    started_at: new Date().toISOString(),
  })
  if (sessionError) {
    console.error('[mux-create-livestream] session insert failed (non-fatal):', sessionError)
  }

  return new Response(
    JSON.stringify({
      streamId: stream.id,
      streamKey: muxData.data.stream_key,
      playbackId: muxData.data.playback_ids[0].id,
      rtmpUrl: 'rtmps://global-live.mux.com:443/app',
      slug: stream.slug || stream.id,
      orientation: streamOrientation,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
