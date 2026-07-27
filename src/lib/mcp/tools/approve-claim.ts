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
  name: "approve_claim",
  title: "Approve or reject a business claim",
  description:
    "Admin only. Approve or reject a pending business claim request. Approve transfers business page ownership to the requester and marks it live.",
  inputSchema: {
    claim_id: z.string().uuid(),
    decision: z.enum(["approve", "reject"]),
    reviewer_notes: z.string().max(1000).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  handler: async ({ claim_id, decision, reviewer_notes }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" });
    if (!isAdmin) return { content: [{ type: "text", text: "Admin only" }], isError: true };

    // Invoke the edge function so the transfer + email side-effects run in one place.
    const url = `${process.env.SUPABASE_URL}/functions/v1/review-business-claim`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.getToken()}`,
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
      },
      body: JSON.stringify({ claim_id, decision, reviewer_notes }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || (body as any)?.error) {
      return {
        content: [{ type: "text", text: (body as any)?.error || `HTTP ${res.status}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Claim ${decision}d.` }],
      structuredContent: { claim_id, decision },
    };
  },
});
