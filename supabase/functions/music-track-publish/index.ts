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
    const auth = req.headers.get('Authorization') || ''
    const token = auth.replace('Bearer ', '')
    if (!token) throw new Error('Unauthorized')

    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData } = await userClient.auth.getUser()
    if (!userData?.user) throw new Error('Unauthorized')
    const userId = userData.user.id

    const { trackId, albumId, trackNumber } = await req.json()
    if (!trackId) throw new Error('trackId required')

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: track, error: tErr } = await admin
      .from('tracks')
      .select('id, creator_id, audio_status')
      .eq('id', trackId)
      .single()
    if (tErr || !track) throw new Error('Track not found')
    if (track.creator_id !== userId) throw new Error('Forbidden')
    if (track.audio_status !== 'ready') throw new Error('Track audio not ready')

    const { error: uErr } = await admin
      .from('tracks')
      .update({ is_published: true, release_date: new Date().toISOString() })
      .eq('id', trackId)
    if (uErr) throw new Error(uErr.message)

    if (albumId) {
      const { data: album } = await admin
        .from('albums')
        .select('id, creator_id')
        .eq('id', albumId)
        .single()
      if (album && album.creator_id === userId) {
        await admin.from('album_tracks').upsert({
          album_id: albumId,
          track_id: trackId,
          track_number: trackNumber || 1,
        })
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}))
