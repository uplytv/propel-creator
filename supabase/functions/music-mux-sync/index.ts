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
    const muxId = Deno.env.get('MUX_TOKEN_ID')
    const muxSecret = Deno.env.get('MUX_TOKEN_SECRET')
    if (!muxId || !muxSecret) throw new Error('Mux credentials missing')
    const authHeader = `Basic ${btoa(`${muxId}:${muxSecret}`)}`

    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: pending } = await admin
      .from('tracks')
      .select('id, creator_id, title, audio_upload_id, audio_status')
      .in('audio_status', ['pending', 'processing'])
      .not('audio_upload_id', 'is', null)
      .limit(50)

    const results: any[] = []

    for (const t of pending || []) {
      try {
        const upRes = await fetch(
          `https://api.mux.com/video/v1/uploads/${t.audio_upload_id}`,
          { headers: { Authorization: authHeader } },
        )
        if (!upRes.ok) continue
        const up = (await upRes.json()).data
        if (!up.asset_id) {
          if (t.audio_status !== 'processing') {
            await admin.from('tracks').update({ audio_status: 'processing' }).eq('id', t.id)
          }
          continue
        }
        const asRes = await fetch(`https://api.mux.com/video/v1/assets/${up.asset_id}`, {
          headers: { Authorization: authHeader },
        })
        if (!asRes.ok) continue
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
            .eq('id', t.id)

          // Email creator (best-effort)
          try {
            const { data: creatorAuth } = await admin.auth.admin.getUserById(t.creator_id)
            const email = creatorAuth?.user?.email
            const username =
              (creatorAuth?.user?.user_metadata as any)?.username ||
              (creatorAuth?.user?.user_metadata as any)?.full_name ||
              'your-page'
            const trackUrl = `https://uply.tv/music/track/${t.id}`
            if (email) {
              await admin.functions.invoke('send-transactional-email', {
                body: {
                  templateName: 'music-track-ready',
                  recipientEmail: email,
                  templateData: { trackTitle: t.title, trackUrl, username },
                },
              })
            }
          } catch (e) {
            console.error('email notify failed', e)
          }
          results.push({ id: t.id, status: 'ready' })
        } else if (asset.status === 'errored') {
          await admin.from('tracks').update({ audio_status: 'errored' }).eq('id', t.id)
          results.push({ id: t.id, status: 'errored' })
        } else {
          await admin.from('tracks').update({ audio_status: 'processing' }).eq('id', t.id)
        }
      } catch (e) {
        console.error('sync failed for track', t.id, e)
      }
    }

    return new Response(JSON.stringify({ checked: pending?.length || 0, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}))
