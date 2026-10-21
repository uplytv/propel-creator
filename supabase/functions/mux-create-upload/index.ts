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

  try {
    const auth = await requireUser(req)
    if ('response' in auth) return auth.response
    const { title, description, userId: bodyUserId, access } = await req.json()
    if (bodyUserId && bodyUserId !== auth.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = auth.user.id


    // Paid uploads (paid lessons, paid products) use Mux SIGNED playback: the
    // playback id alone won't play; sign-playback-token mints a per-viewer JWT
    // after checking entitlement. Refuse rather than silently go public.
    const isPaid = access === 'paid'
    if (isPaid && (!Deno.env.get('MUX_SIGNING_KEY_ID') || !Deno.env.get('MUX_SIGNING_PRIVATE_KEY'))) {
      return new Response(JSON.stringify({ error: 'Paid video uploads are not configured yet (signing keys missing)' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')

    if (!muxTokenId || !muxTokenSecret) {
      throw new Error('Mux API credentials not configured')
    }

    console.log(`Creating upload for user ${userId}, title: "${title}"`)

    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: [isPaid ? 'signed' : 'public'],
          max_resolution_tier: '2160p',        // Allow 4K uploads like YouTube
          mp4_support: 'capped-1080p',         // Generate downloadable MP4 (offline + VOD download)
          per_title_encode: true,              // Per-content encoding optimization (same as YouTube)
          master_access: 'temporary',          // Allow temporary master access for downloading originals
          normalize_audio: true,               // Auto-normalize audio levels across all uploads
          passthrough: userId,                 // Tag assets with creator ID for easier debugging
        }
      })
    })

    if (!muxResponse.ok) {
      const err = await muxResponse.text()
      throw new Error(`Mux API error: ${err}`)
    }

    const muxData = await muxResponse.json()
    const uploadId = muxData.data.id

    console.log(`Mux upload created: ${uploadId}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: insertData, error: insertError } = await supabase.from('mux_assets').insert({
      user_id: userId,
      mux_asset_id: 'pending',
      upload_id: uploadId,
      title: title || 'Untitled Video',
      description: description || null,
      status: 'preparing',
      playback_policy: isPaid ? 'signed' : 'public',
    }).select()

    if (insertError) {
      console.error(`DB insert failed: ${JSON.stringify(insertError)}`)
      throw new Error(`Failed to save asset record: ${insertError.message}`)
    }

    console.log(`DB record created: ${insertData?.[0]?.id} for upload ${uploadId}`)

    return new Response(JSON.stringify({
      uploadUrl: muxData.data.url,
      uploadId: uploadId,
      playbackPolicy: isPaid ? 'signed' : 'public',
      suggestedChunkSize: 10240,  // 10MB chunks for faster uploads on good connections
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error(`Upload error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}))
