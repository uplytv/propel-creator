import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Naive in-memory rate limit per IP (best-effort across warm invocations).
const ipBuckets = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60 // plays/min/IP
function rateLimited(ip: string) {
  const now = Date.now()
  const b = ipBuckets.get(ip)
  if (!b || b.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  b.count++
  return b.count > RATE_LIMIT
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'unknown'
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { trackId, durationPlayedSeconds } = await req.json()
    if (!trackId) throw new Error('trackId required')
    const dur = Math.max(0, Math.floor(Number(durationPlayedSeconds) || 0))

    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    let userId: string | null = null
    const auth = req.headers.get('Authorization') || ''
    const token = auth.replace('Bearer ', '')
    if (token) {
      const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data } = await userClient.auth.getUser()
      userId = data?.user?.id ?? null
    }

    await admin.from('track_plays').insert({
      track_id: trackId,
      user_id: userId,
      duration_played_seconds: dur,
    })

    if (dur >= 30) {
      const { data: cur } = await admin
        .from('tracks')
        .select('play_count')
        .eq('id', trackId)
        .single()
      await admin
        .from('tracks')
        .update({ play_count: Number(cur?.play_count || 0) + 1 })
        .eq('id', trackId)
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

