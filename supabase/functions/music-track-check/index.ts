import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// On-demand mirror of music-mux-sync for a single track id.
// Mirrors the existing mux-check-upload pattern used by the video pipeline.
serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const muxId = Deno.env.get('MUX_TOKEN_ID')
    const muxSecret = Deno.env.get('MUX_TOKEN_SECRET')
    if (!muxId || !muxSecret) throw new Error('Mux credentials missing')
    const muxAuth = `Basic ${btoa(`${muxId}:${muxSecret}`)}`

    const body = await req.json().catch(() => ({}))
    const trackId = String(body.trackId || '').trim()
    if (!trackId) throw new Error('trackId required')

    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: track } = await admin
      .from('tracks')
      .select('id, audio_upload_id, audio_mux_asset_id, audio_status')
      .eq('id', trackId)
      .maybeSingle()
    if (!track) throw new Error('Track not found')

    if (track.audio_status === 'ready') {
      return new Response(JSON.stringify({ status: 'ready' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve asset_id: prefer the one we already stored, else look it up from upload
    let assetId = track.audio_mux_asset_id as string | null
    if (!assetId && track.audio_upload_id) {
      const upRes = await fetch(
        `https://api.mux.com/video/v1/uploads/${track.audio_upload_id}`,
        { headers: { Authorization: muxAuth } },
      )
      if (upRes.ok) {
        const up = (await upRes.json()).data
        assetId = up.asset_id || null
      }
    }

    if (!assetId) {
      if (track.audio_status !== 'processing') {
        await admin.from('tracks').update({ audio_status: 'processing' }).eq('id', trackId)
      }
      return new Response(JSON.stringify({ status: 'processing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const asRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      headers: { Authorization: muxAuth },
    })
    if (!asRes.ok) throw new Error('Mux asset lookup failed')
    const asset = (await asRes.json()).data
    const playbackId = asset.playback_ids?.[0]?.id

    if (asset.status === 'ready' && playbackId) {
      await admin
        .from('tracks')
        .update({
          audio_status: 'ready',
          audio_mux_asset_id: asset.id,
          audio_mux_playback_id: playbackId,
          duration_seconds: Math.round(asset.duration || 0),
        })
        .eq('id', trackId)
      return new Response(
        JSON.stringify({ status: 'ready', playbackId, duration: asset.duration }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (asset.status === 'errored') {
      await admin.from('tracks').update({ audio_status: 'errored' }).eq('id', trackId)
      return new Response(JSON.stringify({ status: 'errored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await admin.from('tracks').update({ audio_status: 'processing' }).eq('id', trackId)
    return new Response(JSON.stringify({ status: 'processing' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}))
