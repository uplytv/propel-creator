import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { checkEdgeRateLimit } from "../_shared/rateLimit.ts";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limit per user (30/hour) — fail-open on infra errors.
    const rlUserId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const rlAllowed = await checkEdgeRateLimit(adminClient, rlUserId, 'aria-assistant', {
      maxCalls: 30,
      windowMs: 60 * 60_000,
    });
    if (!rlAllowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit reached. Try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ARIA is unavailable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data: inputData } = await req.json();

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'seo_optimize': {
        systemPrompt = `You are ARIA, an AI SEO optimizer for UPLY, a creator video platform. Given a video title and description, return an improved title, description, suggested category, and 8 relevant tags. Return ONLY valid JSON with this structure: {"title": "...", "description": "...", "category": "...", "tags": ["tag1", "tag2", ...]}. Categories must be one of: Fitness, Finance, Gaming, Lifestyle, Business, Education, Music, IRL, Other.`;
        userPrompt = `Optimize this video for search and discovery:\nTitle: ${inputData.title}\nDescription: ${inputData.description || 'No description provided'}`;
        break;
      }
      case 'social_captions': {
        systemPrompt = `You are ARIA, a social media expert for UPLY creators. Generate platform-specific captions for sharing a video. Return ONLY valid JSON with this structure: {"tiktok": "...", "instagram": "...", "twitter": "...", "linkedin": "..."}. Each caption should match the platform's tone (TikTok: casual/trendy with emojis, Instagram: polished with hashtags, Twitter/X: concise and punchy under 280 chars, LinkedIn: professional and value-driven). Include the video URL naturally.`;
        userPrompt = `Generate captions for this video:\nTitle: ${inputData.title}\nDescription: ${inputData.description || ''}\nCreator: ${inputData.creatorName || 'Creator'}\nURL: ${inputData.url || ''}`;
        break;
      }
      case 'welcome_message': {
        systemPrompt = `You are ARIA, helping UPLY creators write welcome messages for new community members. Write a warm, personal welcome message. Return ONLY valid JSON: {"message": "..."}. Keep it under 200 words. Be authentic, not corporate.`;
        userPrompt = `Write a welcome message for new members joining ${inputData.creatorName || 'a creator'}'s community. Their niche is: ${inputData.niche || 'general content creation'}.`;
        break;
      }
      case 'video_email': {
        systemPrompt = `You are ARIA, helping UPLY creators draft announcement emails for new videos. Return ONLY valid JSON: {"subject": "...", "body": "..."}. Subject under 60 chars. Body is plain text, 3-4 short paragraphs, conversational tone. Include a CTA to watch.`;
        userPrompt = `Draft an email announcing this new video:\nTitle: ${inputData.title}\nDescription: ${inputData.description || ''}\nCreator: ${inputData.creatorName || 'Creator'}`;
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'ARIA is unavailable right now.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '';

    // Parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      return new Response(
        JSON.stringify({ result: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch {
      return new Response(
        JSON.stringify({ result: { raw: text } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('aria-assistant error:', error);
    return new Response(
      JSON.stringify({ error: 'ARIA is unavailable right now.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
