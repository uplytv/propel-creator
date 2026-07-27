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
  name: "get_business_analytics",
  title: "Business analytics summary",
  description: "Admin only. Returns 7-day views, call taps, maps taps, blog views, and lead counts for a business. Accepts business_id or username.",
  inputSchema: {
    business_id: z.string().uuid().optional(),
    username: z.string().trim().min(1).max(64).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, username }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" });
    if (!isAdmin) return { content: [{ type: "text", text: "Admin only" }], isError: true };

    let resolvedId = business_id ?? null;
    if (!resolvedId && username) {
      const { data: prof } = await supabase.from("profiles").select("id").ilike("username", username).maybeSingle();
      if (prof?.id) {
        const { data: biz } = await supabase.from("business_details").select("id").eq("profile_id", prof.id).maybeSingle();
        resolvedId = biz?.id ?? null;
      }
    }
    if (!resolvedId) return { content: [{ type: "text", text: "Business not found (provide business_id or username)" }], isError: true };

    const { data, error } = await supabase
      .from("business_weekly_summary")
      .select("*")
      .eq("business_id", resolvedId)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Analytics for ${resolvedId}` }],
      structuredContent: { summary: data ?? { business_id: resolvedId, views_7d: 0, call_taps_7d: 0, maps_taps_7d: 0, blog_views_7d: 0, leads_7d: 0, top_blog_post_id: null } },
    };
  },
});
