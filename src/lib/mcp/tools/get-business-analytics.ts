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
  description: "Admin only. Returns 7-day views, call taps, maps taps, blog views, and lead counts for a business.",
  inputSchema: { business_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" });
    if (!isAdmin) return { content: [{ type: "text", text: "Admin only" }], isError: true };

    const { data, error } = await supabase
      .from("business_weekly_summary")
      .select("*")
      .eq("business_id", business_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Analytics for ${business_id}` }],
      structuredContent: { summary: data ?? { business_id, views_7d: 0, call_taps_7d: 0, maps_taps_7d: 0, blog_views_7d: 0, leads_7d: 0, top_blog_post_id: null } },
    };
  },
});
