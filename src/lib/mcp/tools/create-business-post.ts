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
  name: "create_business_post",
  title: "Create business post",
  description: "Admin only. Publish a post on behalf of a business owner (writes to posts as the business's user_id).",
  inputSchema: {
    business_id: z.string().uuid(),
    content: z.string().trim().min(1).max(4000),
    category: z.string().trim().max(64).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ business_id, content, category }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" });
    if (!isAdmin) return { content: [{ type: "text", text: "Admin only" }], isError: true };

    const { data: biz } = await supabase.from("business_details").select("profile_id").eq("id", business_id).maybeSingle();
    if (!biz?.profile_id) return { content: [{ type: "text", text: "Business not found" }], isError: true };
    const { data: prof } = await supabase.from("profiles").select("user_id").eq("id", biz.profile_id).maybeSingle();
    if (!prof?.user_id) return { content: [{ type: "text", text: "Owner not found" }], isError: true };

    const { data, error } = await supabase
      .from("posts")
      .insert({ user_id: prof.user_id, content, category: category ?? null })
      .select("id, content, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Post created (${data.id}).` }], structuredContent: { post: data } };
  },
});
