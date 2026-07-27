import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "create_post",
  title: "Create post",
  description: "Publish a new social post as the signed-in UPLY creator. Writes to the posts table via RLS.",
  inputSchema: {
    content: z.string().trim().min(1).max(4000).describe("Post body text."),
    category: z.string().trim().max(64).optional().describe("Optional category tag (e.g. content, growth, wins)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ content, category }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("posts")
      .insert({ user_id: ctx.getUserId(), content, category: category ?? null })
      .select("id, content, category, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Post created (${data.id}).` }],
      structuredContent: { post: data },
    };
  },
});
