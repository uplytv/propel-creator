// Shared Anthropic (Claude) caller for ARIA agents.
//
// Model tiers (see MODEL_PREMIUM): premium strategic/analytics reasoning runs on
// claude-fable-5 (Anthropic's most capable model); everything else defaults to
// claude-opus-4-8. Callers pass opts.model to opt into a tier.
//
// Fable 5 correctness handled here so callers don't have to:
//   - server-side refusal fallback to Opus 4.8 (Fable's safety classifiers can
//     false-positive on benign creator/analytics work; without a fallback the
//     call just fails). Beta: server-side-fallback-2026-06-01.
//   - text is collected from *text* blocks only — Fable returns thinking blocks
//     first, so content[0] is not the answer.
//   - stop_reason "refusal" (whole chain declined) surfaces as a clean error.

export const MODEL_PREMIUM = "claude-fable-5";
export const MODEL_DEFAULT = "claude-opus-4-8";

export async function callClaude(
  system: string,
  user: string,
  opts?: { json?: boolean; maxTokens?: number; model?: string },
): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const model = opts?.model ?? MODEL_DEFAULT;
  const isFable = model.startsWith("claude-fable") || model.startsWith("claude-mythos");

  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
  const body: any = {
    model,
    max_tokens: opts?.maxTokens ?? 1500,
    system,
    messages: [{ role: "user", content: user }],
  };
  // Opt into transparent fallback to Opus 4.8 on a Fable refusal.
  if (isFable) {
    headers["anthropic-beta"] = "server-side-fallback-2026-06-01";
    body.fallbacks = [{ model: MODEL_DEFAULT }];
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.stop_reason === "refusal") throw new Error("Claude declined this request");

  const text: string = (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  if (opts?.json) {
    const match = text.match(/\{[\s\S]*\}/);
    try {
      return match ? JSON.parse(match[0]) : { raw: text };
    } catch {
      return { raw: text };
    }
  }
  return text;
}
