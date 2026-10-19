import { isAuthorizedCron } from "../_shared/cronAuth.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    if (!await isAuthorizedCron(req, supabase)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update clips trending scores
    const { data: clips } = await supabase
      .from('clips')
      .select('id, like_count, view_count, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    if (clips) {
      for (const c of clips) {
        const hoursSince = (Date.now() - new Date(c.created_at).getTime()) / 3600000
        const score = ((c.like_count || 0) * 3 + (c.view_count || 0)) / (1 + hoursSince / 24)
        await supabase.from('clips').update({ trending_score: Math.round(score * 100) / 100 }).eq('id', c.id)
      }
    }

    // Update stream_recordings
    const { data: recordings } = await supabase
      .from('stream_recordings')
      .select('id, like_count, view_count, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    if (recordings) {
      for (const r of recordings) {
        const hoursSince = (Date.now() - new Date(r.created_at).getTime()) / 3600000
        const score = ((r.like_count || 0) * 3 + (r.view_count || 0)) / (1 + hoursSince / 24)
        await supabase.from('stream_recordings').update({ trending_score: Math.round(score * 100) / 100 }).eq('id', r.id)
      }
    }

    // Update community_posts
    const { data: posts } = await supabase
      .from('community_posts')
      .select('id, like_count, comment_count, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    if (posts) {
      for (const p of posts) {
        const hoursSince = (Date.now() - new Date(p.created_at).getTime()) / 3600000
        const score = ((p.like_count || 0) * 3 + (p.comment_count || 0) * 2) / (1 + hoursSince / 24)
        await supabase.from('community_posts').update({ trending_score: Math.round(score * 100) / 100 }).eq('id', p.id)
      }
    }

    // Update standalone videos
    const { data: videos } = await supabase
      .from('videos')
      .select('id, like_count, comment_count, view_count, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    if (videos) {
      for (const v of videos) {
        const hoursSince = (Date.now() - new Date(v.created_at).getTime()) / 3600000
        const score = ((v.like_count || 0) * 3 + (v.comment_count || 0) * 2 + (v.view_count || 0)) / (1 + hoursSince / 24)
        await supabase.from('videos').update({ trending_score: Math.round(score * 100) / 100 }).eq('id', v.id)
      }
    }

    console.log(`✅ Trending scores refreshed: ${recordings?.length || 0} recordings, ${posts?.length || 0} posts, ${videos?.length || 0} videos`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Trending refresh error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
