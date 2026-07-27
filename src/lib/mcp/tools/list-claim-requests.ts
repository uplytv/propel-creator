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
  name: "list_claim_requests",
  title: "List business claim requests",
  description: "Admin only. List business page claim requests, optionally filtered by status.",
  inputSchema: {
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" });
    if (!isAdmin) return { content: [{ type: "text", text: "Admin only" }], isError: true };

    let q = supabase
      .from("claim_requests")
      .select("id, business_id, requester_user_id, requester_name, requester_email, requester_phone, note, status, reviewer_notes, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data.length} claim request(s).` }],
      structuredContent: { claims: data },
    };
  },
});
