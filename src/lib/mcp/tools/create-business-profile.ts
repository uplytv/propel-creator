import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdmin(ctx: ToolContext) {
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase.rpc("has_role", { _user_id: ctx.getUserId(), _role: "admin" });
  if (error || !data) throw new Error("Admin only");
  return supabase;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40) || "business";
}

async function ensureUniqueUsername(
  supabase: ReturnType<typeof supabaseForUser>,
  base: string
) {
  let candidate = base;
  let n = 1;
  // try up to ~20 variants
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from("profiles").select("id").ilike("username", candidate).maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${base}${n}`;
  }
  return `${base}${Date.now().toString().slice(-5)}`;
}

export default defineTool({
  name: "create_business_profile",
  title: "Create business profile",
  description:
    "Admin only. Create (or promote) a business tenant. If the username matches an existing profile, promote it; otherwise create a new profile row owned by the calling admin (draft until claimed), then upsert business_details. Returns username and public URL.",
  inputSchema: {
    username: z.string().trim().min(1).max(64).optional(),
    user_id: z.string().uuid().optional(),
    business_name: z.string().trim().min(1).max(200),
    category: z.string().trim().max(100).optional(),
    tagline: z.string().trim().max(500).optional(),
    address: z.string().trim().max(500).optional(),
    city: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email().max(255).optional(),
    google_maps_url: z.string().url().optional(),
    google_rating: z.number().min(0).max(5).optional(),
    google_reviews_count: z.number().int().min(0).optional(),
    status: z.enum(["draft", "claimed", "live"]).default("draft"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    try {
      const supabase = await requireAdmin(ctx);
      let profileId: string | null = null;
      let profileUsername: string | null = null;

      if (input.user_id) {
        const { data } = await supabase.from("profiles").select("id, username").eq("user_id", input.user_id).maybeSingle();
        profileId = data?.id ?? null;
        profileUsername = data?.username ?? null;
      } else if (input.username) {
        const { data } = await supabase.from("profiles").select("id, username").ilike("username", input.username).maybeSingle();
        profileId = data?.id ?? null;
        profileUsername = data?.username ?? null;
      }

      if (!profileId) {
        // Create a new admin-owned draft profile
        const base = slugify(input.username || input.business_name);
        const username = await ensureUniqueUsername(supabase, base);
        const { data: created, error: createErr } = await supabase
          .from("profiles")
          .insert({
            user_id: ctx.getUserId(),
            username,
            display_name: input.business_name,
            account_type: "business",
            business_status: input.status,
          } as any)
          .select("id, username")
          .single();
        if (createErr || !created) {
          return { content: [{ type: "text", text: `Failed to create profile: ${createErr?.message ?? "unknown"}` }], isError: true };
        }
        profileId = created.id;
        profileUsername = created.username;
      } else {
        await supabase.from("profiles").update({ account_type: "business", business_status: input.status } as any).eq("id", profileId);
      }

      const { data: biz, error } = await supabase
        .from("business_details")
        .upsert(
          {
            profile_id: profileId,
            business_name: input.business_name,
            category: input.category ?? null,
            tagline: input.tagline ?? null,
            address: input.address ?? null,
            city: input.city ?? null,
            phone: input.phone ?? null,
            email: input.email ?? null,
            google_maps_url: input.google_maps_url ?? null,
            google_rating: input.google_rating ?? null,
            google_reviews_count: input.google_reviews_count ?? null,
          },
          { onConflict: "profile_id" }
        )
        .select()
        .single();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };

      const publicUrl = `https://uply.tv/${profileUsername}`;
      return {
        content: [{ type: "text", text: `Business ${biz.business_name} ready (${input.status}) at ${publicUrl}` }],
        structuredContent: { business: biz, username: profileUsername, public_url: publicUrl },
      };
    } catch (e) {
      return { content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }], isError: true };
    }
  },
});
