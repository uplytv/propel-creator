import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { claudeChat } from '../_shared/claudeChat.ts'
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // AuthN: require JWT or service-role; derive user_id from token
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    let user_id: string | null = null
    if (token === SERVICE_KEY) {
      const body = await req.clone().json().catch(() => ({}))
      user_id = body?.user_id || null
    } else {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
      const { data: { user }, error: authErr } = await userClient.auth.getUser(token)
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      user_id = user.id
    }

    const { stream_id, mux_stream_id } = await req.json()

    if (!mux_stream_id || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing mux_stream_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the requesting user actually owns this mux_stream
    const adminCheck = createClient(supabaseUrl, SERVICE_KEY)
    const { data: streamRow } = await adminCheck
      .from('mux_live_streams')
      .select('user_id')
      .eq('mux_stream_id', mux_stream_id)
      .maybeSingle()
    if (!streamRow || streamRow.user_id !== user_id) {
      return new Response(JSON.stringify({ error: 'Stream not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID')
    const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET')
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return new Response(JSON.stringify({ error: 'Mux credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)

    // Step 1: Find the VOD asset created from this live stream
    const assetsResponse = await fetch(`https://api.mux.com/video/v1/assets?live_stream_id=${mux_stream_id}`, {
      headers: { 'Authorization': `Basic ${muxAuth}` },
    })

    if (!assetsResponse.ok) {
      console.error('Failed to fetch Mux assets for stream')
      return new Response(JSON.stringify({ error: 'Failed to find stream recording' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const assetsData = await assetsResponse.json()
    const vodAsset = assetsData.data?.find((a: any) => a.status === 'ready')

    if (!vodAsset) {
      console.log('No ready VOD asset found yet for stream', mux_stream_id)
      return new Response(JSON.stringify({ error: 'Stream recording not ready yet' }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const vodDuration = vodAsset.duration || 0
    if (vodDuration < 60) {
      return new Response(JSON.stringify({ message: 'Stream too short for auto-shorts', clips: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Step 2: Use AI to identify highlight moments
    // We'll use the stream duration and generate smart clip points
    let highlightMoments: Array<{ start: number; end: number; caption: string }> = []

    if (ANTHROPIC_API_KEY) {
      try {
        const aiData = await claudeChat({
          model: 'claude-sonnet-4-6',
          messages: [{
            role: 'user',
            content: `You are analyzing a live stream recording that is ${Math.round(vodDuration)} seconds long.
Identify 3 potential highlight moments spread throughout the stream that would make great short clips.
Each clip should be 30-45 seconds long.

Return ONLY a JSON array with exactly 3 objects, each having:
- "start": start time in seconds (integer)
- "end": end time in seconds (integer)
- "caption": a catchy caption for the clip (max 100 chars)

Make sure clips don't overlap and are spread across the stream duration.
Return only the JSON array, no other text.`,
          }],
        })

        {
          const content = aiData.choices?.[0]?.message?.content || ''
          // Extract JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            highlightMoments = JSON.parse(jsonMatch[0])
            // Validate and clamp to actual duration
            highlightMoments = highlightMoments
              .filter((m: any) => m.start >= 0 && m.end > m.start && m.end <= vodDuration)
              .map((m: any) => ({
                start: Math.max(0, Math.floor(m.start)),
                end: Math.min(Math.floor(m.end), Math.floor(vodDuration)),
                caption: String(m.caption || 'Highlight').slice(0, 100),
              }))
          }
        }
      } catch (aiErr) {
        console.error('AI analysis failed, using fallback:', aiErr)
      }
    }

    // Fallback: evenly spaced clips if AI didn't work
    if (highlightMoments.length === 0) {
      const clipDuration = 30
      const numClips = Math.min(3, Math.floor(vodDuration / 120))
      for (let i = 0; i < numClips; i++) {
        const start = Math.floor((vodDuration / (numClips + 1)) * (i + 1)) - clipDuration / 2
        highlightMoments.push({
          start: Math.max(0, start),
          end: Math.min(start + clipDuration, Math.floor(vodDuration)),
          caption: `Highlight ${i + 1}`,
        })
      }
    }

    // Step 3: Create clips via Mux Clipping API
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const createdClips = []

    for (const moment of highlightMoments) {
      try {
        const clipResponse = await fetch('https://api.mux.com/video/v1/assets', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${muxAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: [{
              url: `mux://assets/${vodAsset.id}`,
              start_time: moment.start,
              end_time: moment.end,
            }],
            playback_policy: ['public'],
          }),
        })

        if (!clipResponse.ok) {
          console.error('Mux clip creation failed:', await clipResponse.text())
          continue
        }

        const clipData = await clipResponse.json()
        const clipAsset = clipData.data
        const clipPlaybackId = clipAsset.playback_ids?.[0]?.id || null

        const { data: savedClip, error: dbErr } = await adminSupabase
          .from('clips')
          .insert({
            creator_id: user_id,
            clipped_by_user_id: user_id,
            clip_asset_id: clipAsset.id,
            clip_playback_id: clipPlaybackId,
            source_asset_id: vodAsset.id,
            source_type: 'live',
            duration_seconds: moment.end - moment.start,
            caption: moment.caption,
            is_public: true,
            is_auto_short: true,
          })
          .select()
          .single()

        if (dbErr) {
          console.error('Failed to save clip:', dbErr)
        } else {
          createdClips.push(savedClip)
        }
      } catch (clipErr) {
        console.error('Clip creation error:', clipErr)
      }
    }

    // Step 4: Notify creator
    if (createdClips.length > 0) {
      await adminSupabase.from('notifications').insert({
        user_id: user_id,
        type: 'auto_shorts',
        title: 'Auto-Shorts Ready! 🎬',
        message: `${createdClips.length} highlight clips were automatically created from your stream.`,
        link: '/content-library',
      })
    }

    return new Response(JSON.stringify({ 
      message: `Created ${createdClips.length} auto-shorts`,
      clips: createdClips,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Generate shorts error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}))
