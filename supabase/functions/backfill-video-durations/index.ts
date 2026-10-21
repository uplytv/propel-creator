import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')
    if (!muxTokenId || !muxTokenSecret) {
      throw new Error('Mux API credentials not configured')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}`

    // Find videos missing duration
    const { data: videos, error: fetchErr } = await supabase
      .from('videos')
      .select('id, mux_asset_id, playback_id')
      .or('duration_seconds.is.null,duration_seconds.eq.0')
      .not('mux_asset_id', 'is', null)
      .limit(50)

    if (fetchErr) throw fetchErr
    if (!videos || videos.length === 0) {
      return new Response(JSON.stringify({ message: 'No videos to backfill', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let updated = 0
    const errors: string[] = []

    for (const video of videos) {
      try {
        const res = await fetch(`https://api.mux.com/video/v1/assets/${video.mux_asset_id}`, {
          headers: { 'Authorization': authHeader }
        })

        if (!res.ok) {
          const text = await res.text()
          errors.push(`${video.id}: Mux ${res.status} - ${text}`)
          continue
        }

        const assetData = await res.json()
        const duration = assetData.data?.duration

        if (duration && duration > 0) {
          const { error: updateErr } = await supabase
            .from('videos')
            .update({ duration_seconds: Math.round(duration) })
            .eq('id', video.id)

          if (updateErr) {
            errors.push(`${video.id}: DB update failed - ${updateErr.message}`)
          } else {
            updated++
            console.log(`Backfilled video ${video.id}: ${Math.round(duration)}s`)
          }
        }
      } catch (e) {
        errors.push(`${video.id}: ${e.message}`)
      }
    }

    // Also backfill mux_assets table
    const { data: assets } = await supabase
      .from('mux_assets')
      .select('id, mux_asset_id')
      .or('duration.is.null,duration.eq.0')
      .eq('status', 'ready')
      .limit(50)

    let assetsUpdated = 0
    if (assets) {
      for (const asset of assets) {
        try {
          const res = await fetch(`https://api.mux.com/video/v1/assets/${asset.mux_asset_id}`, {
            headers: { 'Authorization': authHeader }
          })
          if (!res.ok) { await res.text(); continue }
          const assetData = await res.json()
          const duration = assetData.data?.duration
          if (duration && duration > 0) {
            await supabase.from('mux_assets')
              .update({ duration: duration })
              .eq('id', asset.id)
            assetsUpdated++
          }
        } catch {}
      }
    }

    return new Response(JSON.stringify({
      videosFound: videos.length,
      videosUpdated: updated,
      assetsUpdated,
      errors: errors.length > 0 ? errors : undefined,
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
