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

  try {
    const { userId, title, description, category, isPublic } = await req.json()

    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')

    if (!muxTokenId || !muxTokenSecret) {
      throw new Error('Mux API credentials not configured')
    }

    const muxResponse = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`
      },
      body: JSON.stringify({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public']
        },
        reconnect_window: 300,
        max_continuous_duration: 43200,
        reduced_latency: true,
        record: true
      })
    })

    if (!muxResponse.ok) {
      const err = await muxResponse.text()
      throw new Error(`Mux API error: ${err}`)
    }

    const muxData = await muxResponse.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: stream, error: dbError } = await supabase.from('mux_live_streams').insert({
      user_id: userId,
      mux_stream_id: muxData.data.id,
      mux_playback_id: muxData.data.playback_ids[0].id,
      stream_key: muxData.data.stream_key,
      title,
      description,
      category,
      is_public: isPublic,
      status: 'idle'
    }).select().single()

    if (dbError) throw dbError

    // Create live_stream_sessions row immediately
    await supabase.from('live_stream_sessions').insert({
      stream_id: stream.id,
      user_id: userId,
      started_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({
      streamId: stream.id,
      streamKey: muxData.data.stream_key,
      playbackId: muxData.data.playback_ids[0].id,
      rtmpUrl: 'rtmps://global-live.mux.com:443/app',
      slug: stream.slug || stream.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
