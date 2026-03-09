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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    switch (type) {
      case 'video.asset.ready':
        await supabase.from('mux_assets')
          .update({
            status: 'ready',
            mux_asset_id: data.id,
            mux_playback_id: data.playback_ids?.[0]?.id,
            duration: data.duration,
            aspect_ratio: data.aspect_ratio,
            updated_at: new Date().toISOString()
          })
          .eq('upload_id', data.upload_id)
        break

      case 'video.asset.errored':
        await supabase.from('mux_assets')
          .update({ status: 'errored', updated_at: new Date().toISOString() })
          .eq('upload_id', data.upload_id)
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
