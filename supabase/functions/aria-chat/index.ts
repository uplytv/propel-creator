const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
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
      ...conversation_history.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'ARIA is unavailable right now. Try again in a moment.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const ariaResponse = data.content?.[0]?.text || 'ARIA is unavailable right now. Try again in a moment.';

    return new Response(
      JSON.stringify({ response: ariaResponse }),
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
