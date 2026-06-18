import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  // Get existing rate limit record
  const { data: existing } = await supabase
    .from('aria_rate_limits')
    .select('id, request_count, window_start')
    .eq('user_id', userId)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.request_count >= RATE_LIMIT_MAX) {
      return false; // Rate limited
    }
    // Increment counter
    await supabase
      .from('aria_rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id);
    return true;
  }

  // Create new window
  await supabase
    .from('aria_rate_limits')
    .insert({ user_id: userId, request_count: 1, window_start: now.toISOString() });
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with anon client
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

    const userId = claimsData.claims.sub as string;

    // Rate limiting with service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const withinLimit = await checkRateLimit(adminClient, userId);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ error: 'Rate limit reached. Try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(
        JSON.stringify({ error: 'ARIA is unavailable right now. Try again in a moment.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, conversation_history = [], creator_context = {} } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are ARIA, the AI growth partner built into UPLY — the all-in-one creator monetization platform. You are powered by Claude and purpose-built to help creators grow their audience, increase their revenue, and build businesses that last.

You have access to this creator's live platform data:
${JSON.stringify(creator_context, null, 2)}

Your personality: You are direct, strategic, and warm — but you never waste words. You speak like a world-class growth advisor who genuinely cares about the person in front of you. You are not a chatbot. You are not generic. Every single response is specific to this creator's numbers, their content type, and their platform. You are concise — 3 to 4 sentences maximum unless the creator explicitly asks for a detailed breakdown. You always close with exactly one specific action the creator should take today — not a list, not options, one thing.

You can help with: revenue optimization, pricing strategy, content planning, live stream strategy, community growth, subscriber retention, and reading their analytics.

Rules:
- Never make up numbers or fabricate data
- If you don't have enough context, ask one clarifying question — never two
- Never use phrases like "Great question!" or "Certainly!" or "As an AI..."
- Never give advice that isn't directly tied to their actual data
- If their numbers are low, be honest and tell them why and what to do — do not sugarcoat`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'ARIA is unavailable right now. Try again in a moment.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const ariaResponse = data.choices?.[0]?.message?.content || 'ARIA is unavailable right now. Try again in a moment.';

    return new Response(
      JSON.stringify({ response: ariaResponse, reply: ariaResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('aria-chat error:', error);
    return new Response(
      JSON.stringify({ error: 'ARIA is unavailable right now. Try again in a moment.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
