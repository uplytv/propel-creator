import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const idea = body.idea || body.prompt;
    const productType = body.productType;

    if (!idea) {
      return new Response(JSON.stringify({ error: "idea/prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabels: Record<string, string> = {
      course: "online course",
      community: "paid membership community",
      service: "coaching/consulting service",
      digital: "digital product",
      coaching: "coaching/consulting service",
    };
    const label = productType ? (typeLabels[productType] || productType) : "digital product or service";

    const systemPrompt = productType
      ? `You are a world-class creator economy copywriter. Generate a compelling product name and description for a ${label}. Return the product type and a suggested price.`
      : `You are a world-class creator economy copywriter. Based on the user's idea, determine the best product type (one of: course, community, coaching, digital) and generate a compelling name, description, suggested price, and the chosen type.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `My idea: ${idea}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_copy",
              description: "Return product details including name, description, type, and price",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Catchy product name, max 60 chars" },
                  description: { type: "string", description: "Benefit-driven description, 1-2 sentences, max 160 chars" },
                  type: { type: "string", enum: ["course", "community", "coaching", "digital"], description: "Product type" },
                  price: { type: "number", description: "Suggested price in USD" },
                },
                required: ["name", "description", "type", "price"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_copy" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      // If productType was provided, override the type
      if (productType) result.type = productType === "service" ? "coaching" : productType;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-copy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
