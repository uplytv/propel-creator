import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { source_asset_id, start_time, end_time, caption } = await req.json()

    if (!source_asset_id || start_time === undefined || end_time === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields: source_asset_id, start_time, end_time' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const duration = end_time - start_time
    if (duration < 5 || duration > 60) {
      return new Response(JSON.stringify({ error: 'Clip must be between 5 and 60 seconds' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID')
    const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET')

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return new Response(JSON.stringify({ error: 'Mux credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)

    // Create a clip using Mux's clipping API
    const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${muxAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: [{
          url: `mux://assets/${source_asset_id}`,
          start_time: start_time,
          end_time: end_time,
        }],
        playback_policy: ['public'],
      }),
    })

    if (!muxResponse.ok) {
      const muxError = await muxResponse.text()
      console.error('Mux clipping error:', muxError)
      return new Response(JSON.stringify({ error: 'Failed to create clip via Mux', details: muxError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const muxData = await muxResponse.json()
    const clipAsset = muxData.data
    const clipPlaybackId = clipAsset.playback_ids?.[0]?.id || null

    // Save to clips table using service role for insert
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: clip, error: insertError } = await adminSupabase
      .from('clips')
      .insert({
        creator_id: user.id,
        clipped_by_user_id: user.id,
        clip_asset_id: clipAsset.id,
        clip_playback_id: clipPlaybackId,
        source_asset_id: source_asset_id,
        source_type: 'vod',
        duration_seconds: Math.round(duration),
        caption: caption || '',
        is_public: true,
        is_auto_short: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('DB insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to save clip' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ 
      clip,
      mux_asset_id: clipAsset.id,
      playback_id: clipPlaybackId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Create clip error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
