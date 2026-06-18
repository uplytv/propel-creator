import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { claudeChat } from "../_shared/claudeChat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { job_description, skill_category, talent_profiles } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    if (!talent_profiles || talent_profiles.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are ARIA, a talent matching AI for a creator economy marketplace. Given a job description and a list of talent profiles, return the top 3 best matches. You must use the suggest_matches tool to return results.",
      },
      {
        role: "user",
        content: `Job Description: ${job_description}\nSkill Category: ${skill_category}\n\nAvailable Talent:\n${JSON.stringify(talent_profiles, null, 2)}`,
      },
    ];
    const tools = [
      {
        type: "function",
        function: {
          name: "suggest_matches",
          description: "Return the top 3 best-matched talent profiles for this job",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    display_name: { type: "string", description: "Name of the talent" },
                    skills: { type: "array", items: { type: "string" } },
                    score: { type: "number", description: "Their creator economy score" },
                    reason: { type: "string", description: "Why they are a good match (1 sentence)" },
                  },
                  required: ["display_name", "skills", "score", "reason"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    ];
    const tool_choice = { type: "function", function: { name: "suggest_matches" } };

    let result: any;
    try {
      result = await claudeChat({
        model: "claude-haiku-4-5",
        messages,
        tools,
        tool_choice,
      });
    } catch (err) {
      console.error("Claude error:", (err as Error).message);
      throw new Error("AI gateway error");
    }
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const suggestions = toolCall ? JSON.parse(toolCall.function.arguments).suggestions : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-talent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
