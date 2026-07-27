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
  name: "update_business_profile",
  title: "Update business profile",
  description:
    "Admin only. Update fields on an existing business_details row and optionally change the business_status (draft/claimed/live).",
  inputSchema: {
    business_id: z.string().uuid(),
    business_name: z.string().trim().min(1).max(200).optional(),
    category: z.string().trim().max(100).optional(),
    tagline: z.string().trim().max(500).optional(),
    address: z.string().trim().max(500).optional(),
    city: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().max(255).optional(),
    google_maps_url: z.string().url().optional(),
    hours: z.record(z.string()).optional(),
    services: z.array(z.object({ title: z.string(), description: z.string().optional(), price: z.string().optional() })).optional(),
    testimonials: z.array(z.object({ author: z.string(), text: z.string(), rating: z.number().int().min(1).max(5).optional() })).optional(),
    status: z.enum(["draft", "claimed", "live"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: isAdmin } = await supabase.rpc("has_role" as never, { _user_id: ctx.getUserId(), _role: "admin" } as never);
    if (!isAdmin) return { content: [{ type: "text", text: "Admin only" }], isError: true };

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (k === "business_id" || k === "status") continue;
      if (v !== undefined) patch[k] = v;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("business_details").update(patch).eq("id", input.business_id);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    }

    if (input.status) {
      const { data: biz } = await supabase.from("business_details").select("profile_id").eq("id", input.business_id).maybeSingle();
      if (biz?.profile_id) {
        await supabase.from("profiles").update({ business_status: input.status }).eq("id", biz.profile_id);
      }
    }

    return { content: [{ type: "text", text: `Business ${input.business_id} updated.` }] };
  },
});
