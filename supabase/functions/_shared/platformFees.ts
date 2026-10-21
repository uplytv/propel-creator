export type CreatorPlan = "free" | "pro" | "studio";
export const LEGACY_PLATFORM_FEE_RATE = 0.05;
export const PLAN_BASED_FEES_ENABLED = false;

export function getPlatformFeeRate(plan?: string | null, enabled = PLAN_BASED_FEES_ENABLED): number {
  if (!enabled) return LEGACY_PLATFORM_FEE_RATE;
  if (plan === "pro" || plan === "studio") return 0;
  if (plan && plan !== "free") return LEGACY_PLATFORM_FEE_RATE;
  return 0.03;
}

export function planBasedFeesEnabled(): boolean {
  const runtime = globalThis as typeof globalThis & { Deno?: { env: { get: (key: string) => string | undefined } } };
  return runtime.Deno?.env.get("PLAN_BASED_FEES_ENABLED") === "true";
}

// Disabled calls do not query anything. Enabled calls use only trusted billing data.
export async function getCreatorPlatformFeeRate(
  client: { from: (name: string) => any }, creatorId: string | null | undefined,
  legacyRate = LEGACY_PLATFORM_FEE_RATE,
): Promise<number> {
  if (!planBasedFeesEnabled()) return legacyRate;
  if (!creatorId) throw new Error("Creator identity required for plan-based fees");
  const { data, error } = await client.from("creator_billing_plans")
    .select("plan, status").eq("user_id", creatorId).maybeSingle();
  if (error) throw new Error("Creator billing plan lookup failed");
  const plan = data && ["active", "trialing"].includes(data.status) ? data.plan : "free";
  return getPlatformFeeRate(plan, true);
}