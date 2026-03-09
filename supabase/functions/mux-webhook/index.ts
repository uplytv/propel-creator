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
    const body = await req.json()
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
          // This is a recording from a live stream — look up the stream to get user info
          const { data: stream } = await supabase
            .from('mux_live_streams')
            .select('id, user_id, title, description, category')
            .eq('mux_stream_id', liveStreamId)
            .single()

          if (stream) {
            // Insert a new mux_assets record for the recording
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

            // Also create a live_stream_session record
            await supabase.from('live_stream_sessions').insert({
              stream_id: stream.id,
              user_id: stream.user_id,
              mux_asset_id: data.id,
              started_at: new Date().toISOString(),
            })

            console.log(`Saved live stream recording for user ${stream.user_id}, asset ${data.id}`)
          }
        } else if (data.upload_id) {
          // Standard VOD upload
          await supabase.from('mux_assets')
            .update({
              status: 'ready',
              mux_asset_id: data.id,
              mux_playback_id: playbackId,
              duration: data.duration,
              aspect_ratio: data.aspect_ratio,
              updated_at: new Date().toISOString()
            })
            .eq('upload_id', data.upload_id)
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

      case 'video.live_stream.active':
        await supabase.from('mux_live_streams')
          .update({
            status: 'active',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('mux_stream_id', data.id)
        break

      case 'video.live_stream.idle':
        await supabase.from('mux_live_streams')
          .update({
            status: 'idle',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('mux_stream_id', data.id)
        break
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
