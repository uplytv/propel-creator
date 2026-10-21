import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireUser, withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withCors(async (req) => {
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

  const auth = await requireUser(req)
  if ('response' in auth) return auth.response
  if (body?.userId && body.userId !== auth.user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden', traceId }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const userId = auth.user.id
  const { title, description, category, isPublic, orientation, ppv, ppvPrice } = body || {}
  const streamOrientation = orientation === 'portrait' ? 'portrait' : 'landscape'
  // Additive PPV param from GoLive's pay-per-view toggle. Older clients that
  // don't send it get exactly the previous behavior (public policy).
  const isPpvRequested = ppv === true
  log('input_validated', 'ok', { userId: userId ? `${String(userId).slice(0, 8)}…` : null, orientation: streamOrientation, hasTitle: !!title, ppv: isPpvRequested })

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

  // ─── Playback policy decision ──────────────────────────────────────────────
  // PPV streams get Mux SIGNED playback (per-viewer JWTs minted by the
  // sign-playback-token edge fn) when the signing secrets exist, so a leaked
  // HLS URL is useless without a token. Recordings inherit the policy via
  // new_asset_settings. Non-PPV streams keep the exact public policy this
  // function has always used. If the signing secrets are not configured, PPV
  // stream creation is refused (fail closed, security batch 1).
  const signingConfigured =
    !!Deno.env.get('MUX_SIGNING_KEY_ID') && !!Deno.env.get('MUX_SIGNING_PRIVATE_KEY')
  const useSignedPolicy = isPpvRequested && signingConfigured
  if (isPpvRequested && !signingConfigured) {
    // SECURITY (batch 1): PPV now FAILS CLOSED. A public playback policy means a
    // leaked HLS link plays for non-buyers, so refuse to create a PPV stream
    // until MUX_SIGNING_KEY_ID / MUX_SIGNING_PRIVATE_KEY are configured.
    log('ppv_refused_signing_not_configured', 'error')
    return new Response(JSON.stringify({ error: 'Pay-per-view is temporarily unavailable (signed playback not configured). Go live without PPV or contact support.', traceId }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (useSignedPolicy) log('ppv_signed_policy_selected', 'ok')
  const playbackPolicy = useSignedPolicy ? ['signed'] : ['public']

  const muxPayload = {
    playback_policy: playbackPolicy,
    new_asset_settings: {
      playback_policy: playbackPolicy,
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

  const baseRow: Record<string, unknown> = {
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
  }

  // Flag PPV at insert time so the vault trigger (migration 20260706160000)
  // moves the playback id into stream_playback_vault immediately — no window
  // where a PPV (possibly signed) playback id sits in the public column.
  // GoLive still runs its own is_ppv/ppv_price update afterwards (idempotent).
  const insertRow: Record<string, unknown> = { ...baseRow }
  if (isPpvRequested) {
    insertRow.is_ppv = true
    const parsedPrice = typeof ppvPrice === 'number' && isFinite(ppvPrice) ? ppvPrice : NaN
    if (parsedPrice >= 1) insertRow.ppv_price = parsedPrice
  }

  let { data: stream, error: dbError } = await supabase
    .from('mux_live_streams')
    .insert(insertRow)
    .select()
    .single()

  // Never block going live: if the PPV columns aren't deployed yet, retry the
  // legacy insert (GoLive's follow-up update is the existing PPV path there).
  if (dbError && isPpvRequested) {
    log('db_insert_ppv_fields_failed_retrying_plain', 'error', { message: dbError.message })
    ;({ data: stream, error: dbError } = await supabase
      .from('mux_live_streams')
      .insert(baseRow)
      .select()
      .single())
  }

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
}))
