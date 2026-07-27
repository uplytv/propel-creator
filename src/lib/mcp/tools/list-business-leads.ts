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
  name: "list_business_leads",
  title: "List business leads",
  description: "Admin only. List recent leads captured on a business profile page.",
  inputSchema: {
    business_id: z.string().uuid(),
    limit: z.number().int().min(1).max(100).optional(),
    only_unhandled: z.boolean().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, limit, only_unhandled }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" });
    if (!isAdmin) return { content: [{ type: "text", text: "Admin only" }], isError: true };

    let q = supabase
      .from("business_leads")
      .select("id, name, phone, email, message, source, handled, created_at")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (only_unhandled) q = q.eq("handled", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data.length} leads.` }],
      structuredContent: { leads: data },
    };
  },
});
