import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(withCors(async (req) => {
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

    const { asset_id, asset_type } = await req.json()

    if (!asset_id || !asset_type) {
      return new Response(JSON.stringify({ error: 'Missing asset_id or asset_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Look up the mux_asset_id from the relevant table AND verify the caller owns the asset.
    let muxAssetId: string | null = null
    let ownerOk = false

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (asset_type === 'clip') {
      const { data } = await adminSupabase
        .from('clips')
        .select('clip_asset_id, creator_id, clipped_by_user_id')
        .eq('id', asset_id)
        .single()
      muxAssetId = data?.clip_asset_id || null
      ownerOk = !!data && (data.creator_id === user.id || data.clipped_by_user_id === user.id)
    } else if (asset_type === 'recording') {
      const { data } = await adminSupabase
        .from('stream_recordings')
        .select('mux_asset_id, creator_id')
        .eq('id', asset_id)
        .single()
      muxAssetId = data?.mux_asset_id || null
      ownerOk = !!data && data.creator_id === user.id
    } else if (asset_type === 'vod') {
      const { data } = await adminSupabase
        .from('mux_assets')
        .select('mux_asset_id, user_id')
        .eq('id', asset_id)
        .single()
      muxAssetId = data?.mux_asset_id || null
      ownerOk = !!data && (data as any).user_id === user.id
    }

    if (!muxAssetId) {
      return new Response(JSON.stringify({ error: 'Asset not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!ownerOk) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
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

    // Get asset details from Mux
    const muxResponse = await fetch(`https://api.mux.com/video/v1/assets/${muxAssetId}`, {
      headers: {
        'Authorization': `Basic ${muxAuth}`,
        'Content-Type': 'application/json',
      },
    })

    if (!muxResponse.ok) {
      const err = await muxResponse.text()
      console.error('Mux API error:', err)
      return new Response(JSON.stringify({ error: 'Failed to fetch asset from Mux' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const muxData = await muxResponse.json()
    const asset = muxData.data

    // Find MP4 static rendition or master access
    let downloadUrl: string | null = null
    let fileSize: number | null = null

    // Check for static renditions (mp4_support)
    if (asset.static_renditions?.status === 'ready') {
      const files = asset.static_renditions.files || []
      // Prefer highest quality
      const best = files.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0]
      if (best) {
        const playbackId = asset.playback_ids?.[0]?.id
        if (playbackId) {
          downloadUrl = `https://stream.mux.com/${playbackId}/${best.name}`
          fileSize = best.filesize || null
        }
      }
    }

    // Fallback: use the master access URL
    if (!downloadUrl && asset.master_access === 'temporary') {
      // Request a temporary master access URL
      const masterRes = await fetch(`https://api.mux.com/video/v1/assets/${muxAssetId}/master-access`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${muxAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ master_access: 'temporary' }),
      })
      if (masterRes.ok) {
        const masterData = await masterRes.json()
        downloadUrl = masterData.data?.master?.url || null
      }
    }

    // Fallback: construct a direct MP4 URL from playback_id
    if (!downloadUrl) {
      const playbackId = asset.playback_ids?.[0]?.id
      if (playbackId) {
        downloadUrl = `https://stream.mux.com/${playbackId}/high.mp4`
      }
    }

    return new Response(JSON.stringify({ 
      download_url: downloadUrl,
      file_size: fileSize,
      duration: asset.duration,
      playback_id: asset.playback_ids?.[0]?.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Download asset error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}))
