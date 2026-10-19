import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { claudeChat } from "../_shared/claudeChat.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkEdgeRateLimit } from "../_shared/rateLimit.ts";
import { fetchPublicPage } from "./urlGuard.ts";

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
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authorization } } });
    const { data: auth, error: authError } = await anon.auth.getUser();
    if (authError || !auth.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    if (!await checkEdgeRateLimit(admin, auth.user.id, "import-from-url", { maxCalls: 10, windowMs: 10 * 60_000 })) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const { url } = await req.json();
    if (typeof url !== "string" || !url || url.length > 2048) {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the page content
    let pageContent = "";
    try {
      const html = await fetchPublicPage(url);
      // Extract text content - strip HTML tags and limit size
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 4000);
    } catch (fetchErr) {
      return new Response(JSON.stringify({ error: "URL must resolve to a public HTTP(S) page and complete within the fetch limits" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to extract product info from the page content
    const messages = [
      {
        role: "system",
        content: "You are an expert at analyzing landing pages and extracting product information. Based on the page content, determine the product name, a compelling description, the product type (one of: course, community, coaching, digital), and the price. If you can't find a price, suggest a reasonable one based on the product type.",
      },
      {
        role: "user",
        content: `Extract product details from this page (${url}):\n\n${pageContent}`,
      },
    ];
    const tools = [
      {
        type: "function",
        function: {
          name: "extract_product",
          description: "Extract product details from a landing page",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Product name, max 60 chars" },
              description: { type: "string", description: "Product description, 1-2 sentences, max 200 chars" },
              type: { type: "string", enum: ["course", "community", "coaching", "digital"], description: "Product type" },
              price: { type: "number", description: "Price in USD" },
            },
            required: ["name", "description", "type", "price"],
            additionalProperties: false,
          },
        },
      },
    ];
    const tool_choice = { type: "function", function: { name: "extract_product" } };

    let data: any;
    try {
      data = await claudeChat({
        model: "claude-haiku-4-5",
        messages,
        tools,
        tool_choice,
      });
    } catch (err) {
      console.error("Claude error:", (err as Error).message);
      throw new Error("AI gateway error");
    }
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
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
    console.error("import-from-url error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
