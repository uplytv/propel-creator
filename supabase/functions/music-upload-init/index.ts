import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const auth = req.headers.get('Authorization') || ''
    const token = auth.replace('Bearer ', '')
    if (!token) throw new Error('Unauthorized')

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) throw new Error('Unauthorized')
    const userId = userData.user.id

    const body = await req.json().catch(() => ({}))
    const title = (body.title || 'Untitled Track').toString().slice(0, 200)
    const genre = body.genre ? String(body.genre).slice(0, 60) : null
    const isExplicit = !!body.is_explicit

    const muxId = Deno.env.get('MUX_TOKEN_ID')
    const muxSecret = Deno.env.get('MUX_TOKEN_SECRET')
    if (!muxId || !muxSecret) throw new Error('Mux credentials missing')

    const muxRes = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${muxId}:${muxSecret}`)}`,
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
          normalize_audio: true,
          passthrough: `music:${userId}`,
        },
      }),
    })
    if (!muxRes.ok) throw new Error(`Mux upload error: ${await muxRes.text()}`)
    const muxData = await muxRes.json()
    const uploadId = muxData.data.id
    const uploadUrl = muxData.data.url

    const admin = createClient(url, serviceKey)
    const { data: track, error: insErr } = await admin
      .from('tracks')
      .insert({
        creator_id: userId,
        title,
        genre,
        is_explicit: isExplicit,
        audio_upload_id: uploadId,
        audio_status: 'pending',
        is_published: false,
      })
      .select('id')
      .single()
    if (insErr) throw new Error(insErr.message)

    return new Response(
      JSON.stringify({ trackId: track.id, uploadUrl, uploadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}))
