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

  // Trace ID + step accumulator for end-to-end visibility
  const traceId = crypto.randomUUID()
  const t0 = Date.now()
  const steps: Array<{ step: string; status: 'ok' | 'error'; ms: number; detail?: any }> = []
  const log = (step: string, status: 'ok' | 'error', detail?: any) => {
    const ms = Date.now() - t0
    steps.push({ step, status, ms, detail })
    const line = `[mux-create-livestream][${traceId}] ${status === 'ok' ? '✓' : '✗'} ${step} (+${ms}ms)`
    if (status === 'ok') console.log(line, detail ?? '')
    else console.error(line, detail ?? '')
  }

  log('request_received', 'ok', { method: req.method })

  let body: any
  try {
    body = await req.json()
    log('body_parsed', 'ok', { keys: Object.keys(body || {}) })
  } catch (e) {
    log('body_parse_failed', 'error', { message: String(e) })
    return new Response(JSON.stringify({ error: 'Invalid JSON body', traceId, steps }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { userId, title, description, category, isPublic, orientation } = body || {}
  const streamOrientation = orientation === 'portrait' ? 'portrait' : 'landscape'
  log('input_validated', 'ok', { userId: userId ? `${String(userId).slice(0, 8)}…` : null, orientation: streamOrientation, hasTitle: !!title })

  if (!userId) {
    log('missing_user_id', 'error')
    return new Response(JSON.stringify({ error: 'userId is required', traceId, steps }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
  const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')

  if (!muxTokenId || !muxTokenSecret) {
    log('mux_credentials_missing', 'error')
    return new Response(JSON.stringify({ error: 'Mux API credentials not configured', traceId, steps }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  log('mux_credentials_present', 'ok')

  const muxPayload = {
    playback_policy: ['public'],
    new_asset_settings: {
      playback_policy: ['public'],
      mp4_support: 'capped-1080p',
      normalize_audio: true,
    },
    reconnect_window: 300,
    max_continuous_duration: 43200,
    latency_mode: 'reduced',
    passthrough: JSON.stringify({ userId, orientation: streamOrientation }),
  }

  let muxData: any
  try {
    log('mux_api_call_start', 'ok')
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
      log('mux_api_error', 'error', { status: muxResponse.status, body: errText.slice(0, 500) })
      return new Response(
        JSON.stringify({
          error: `Mux API error (${muxResponse.status}): ${errText}`,
          traceId,
          steps,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    muxData = await muxResponse.json()
    log('mux_api_call_success', 'ok', { muxStreamId: muxData?.data?.id })
  } catch (e: any) {
    log('mux_fetch_threw', 'error', { message: e?.message || String(e) })
    return new Response(JSON.stringify({ error: `Mux request failed: ${e?.message || e}`, traceId, steps }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  log('supabase_client_ready', 'ok')

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
    log('db_insert_failed', 'error', { message: dbError.message, code: (dbError as any).code })
    return new Response(JSON.stringify({ error: `DB insert failed: ${dbError.message}`, traceId, steps }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  log('db_insert_success', 'ok', { streamId: stream.id, slug: stream.slug })

  const { error: sessionError } = await supabase.from('live_stream_sessions').insert({
    stream_id: stream.id,
    user_id: userId,
    started_at: new Date().toISOString(),
  })
  if (sessionError) {
    log('session_insert_failed_nonfatal', 'error', { message: sessionError.message })
  } else {
    log('session_insert_success', 'ok')
  }

  log('done', 'ok', { totalMs: Date.now() - t0 })

  return new Response(
    JSON.stringify({
      streamId: stream.id,
      streamKey: muxData.data.stream_key,
      playbackId: muxData.data.playback_ids[0].id,
      rtmpUrl: 'rtmps://global-live.mux.com:443/app',
      slug: stream.slug || stream.id,
      orientation: streamOrientation,
      traceId,
      steps,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
