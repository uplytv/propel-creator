// Shared Anthropic (Claude) caller for ARIA event agents.
// Matches the model/headers used by the existing aria-* functions.
export async function callClaude(
  system: string,
  user: string,
  opts?: { json?: boolean; maxTokens?: number },
): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: opts?.maxTokens ?? 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
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
