import { constantTimeEqual } from "./constantTime.ts";

interface CronClient {
  auth: { getUser(token: string): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(name: string, args: Record<string, string>): PromiseLike<{ data: unknown; error: unknown }>;
}

export async function isAuthorizedCron(req: Request, supabase: CronClient): Promise<boolean> {
  const secret = Deno.env.get("INTERNAL_CRON_SECRET");
  if (!secret) {
    console.warn("cronAuth: INTERNAL_CRON_SECRET not set, allowing unauthenticated call");
    return true;
  }
  const supplied = req.headers.get("x-cron-secret");
  if (supplied && await constantTimeEqual(supplied, secret)) return true;
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice(7);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && await constantTimeEqual(token, serviceKey)) return true;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return false;
    const role = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    return !role.error && role.data === true;
  } catch {
    return false;
  }
}