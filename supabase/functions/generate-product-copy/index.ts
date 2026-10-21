import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { claudeChat } from "../_shared/claudeChat.ts";
import { requireUser, serviceClient, strictRateLimit, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: authenticated callers only; 10 calls / 10 min, fails CLOSED.
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;
    if (!(await strictRateLimit(serviceClient(), `user:${auth.user.id}`, "generate-product-copy", 10, 10 * 60_000))) {
      return new Response(JSON.stringify({ error: "Too many requests. Please wait a few minutes and try again." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Deno.env.get("ANTHROPIC_API_KEY")) throw new Error("ANTHROPIC_API_KEY is not configured");

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

    let data: any;
    try {
      data = await claudeChat({
        model: "claude-sonnet-4-6",
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
      });
    } catch (err) {
      console.error("AI gateway error:", (err as Error).message);
      throw new Error("AI gateway error");
    }
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
}));
