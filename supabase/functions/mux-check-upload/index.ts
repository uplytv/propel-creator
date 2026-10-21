import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { uploadId } = await req.json()

    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')

    if (!muxTokenId || !muxTokenSecret) {
      throw new Error('Mux API credentials not configured')
    }

    const authHeader = `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`

    // Check the upload status
    const uploadRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
      headers: { 'Authorization': authHeader }
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      throw new Error(`Mux upload check failed: ${err}`)
    }

    const uploadData = await uploadRes.json()
    const upload = uploadData.data

    console.log(`Upload ${uploadId} status: ${upload.status}, asset_id: ${upload.asset_id}`)

    // If the upload has an asset_id, check the asset
    if (upload.asset_id) {
      const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${upload.asset_id}`, {
        headers: { 'Authorization': authHeader }
      })

      if (assetRes.ok) {
        const assetData = await assetRes.json()
        const asset = assetData.data
        const playbackId = asset.playback_ids?.[0]?.id

        console.log(`Asset ${asset.id} status: ${asset.status}, playback: ${playbackId}, duration: ${asset.duration}`)

        // Update the DB record when ready
        if (asset.status === 'ready' && playbackId) {
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          )

          await supabase.from('mux_assets')
            .update({
              status: 'ready',
              mux_asset_id: asset.id,
              mux_playback_id: playbackId,
              duration: asset.duration,
              aspect_ratio: asset.aspect_ratio,
              updated_at: new Date().toISOString()
            })
            .eq('upload_id', uploadId)

          return new Response(JSON.stringify({
            status: 'ready',
            assetId: asset.id,
            playbackId: playbackId,
            duration: asset.duration || 0,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({
          status: asset.status,
          assetId: asset.id,
          playbackId: playbackId || null,
          duration: asset.duration || 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response(JSON.stringify({
      status: upload.status === 'asset_created' ? 'preparing' : upload.status,
      assetId: upload.asset_id || null,
      playbackId: null,
      duration: 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}))
