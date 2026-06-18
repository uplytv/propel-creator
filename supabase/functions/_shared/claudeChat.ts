// OpenAI-compatible -> Anthropic Messages adapter.
//
// Lets us move ARIA functions off the Lovable/Gemini gateway and onto Claude
// with a near one-line change per function: callers keep building OpenAI-style
// `{ model, messages, tools, tool_choice, response_format }` and keep reading
// `data.choices[0].message.content` / `.tool_calls`. This adapter translates
// the request to the Anthropic Messages API and the response back to the
// OpenAI shape. Requires ANTHROPIC_API_KEY.
//
// Model IDs are Anthropic's: claude-opus-4-8 | claude-sonnet-4-6 | claude-haiku-4-5.

interface OpenAIMessage { role: string; content: any }
interface ClaudeChatReq {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  tools?: any[];
  tool_choice?: any;
  response_format?: any;
}

export async function claudeChat(req: ClaudeChatReq): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const asText = (c: any) => (typeof c === "string" ? c : JSON.stringify(c));

  // system-role messages -> Anthropic top-level `system`
  const system = req.messages
    .filter((m) => m.role === "system")
    .map((m) => asText(m.content))
    .join("\n\n");

  // user/assistant turns; Anthropic requires the first turn to be `user`
  let messages = req.messages
    .filter((m) => m.role !== "system" && m.role !== "tool")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: asText(m.content) }));
  if (messages.length === 0 || messages[0].role !== "user") {
    messages = [{ role: "user", content: "Begin." }, ...messages];
  }

  // OpenAI function tools -> Anthropic tools
  const tools = (req.tools ?? []).map((t: any) => {
    const fn = t.function ?? t;
    return {
      name: fn.name,
      description: fn.description ?? "",
      input_schema: fn.parameters ?? fn.input_schema ?? { type: "object", properties: {} },
    };
  });

  // OpenAI tool_choice -> Anthropic tool_choice
  let toolChoice: any;
  if (req.tool_choice === "required" || req.tool_choice === "any") toolChoice = { type: "any" };
  else if (req.tool_choice && typeof req.tool_choice === "object" && (req.tool_choice.function?.name || req.tool_choice.name)) {
    toolChoice = { type: "tool", name: req.tool_choice.function?.name ?? req.tool_choice.name };
  } else if (tools.length > 0) toolChoice = { type: "auto" };

  const wantsJson = req.response_format?.type === "json_object" || req.response_format?.type === "json_schema";
  const sys = wantsJson ? `${system}\n\nReturn ONLY valid JSON. No markdown fences, no preamble.` : system;

  const body: any = { model: req.model, max_tokens: req.max_tokens ?? 2048, messages };
  if (sys) body.system = sys;
  if (tools.length) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();

  // Anthropic response -> OpenAI shape
  const blocks: any[] = data.content ?? [];
  let text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("");
  if (wantsJson) text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const toolUses = blocks.filter((b) => b.type === "tool_use");

  const message: any = { role: "assistant", content: text || null };
  if (toolUses.length) {
    message.tool_calls = toolUses.map((tu: any, i: number) => ({
      id: tu.id ?? `call_${i}`,
      type: "function",
      function: { name: tu.name, arguments: JSON.stringify(tu.input ?? {}) },
    }));
  }

  return {
    choices: [{ message, finish_reason: data.stop_reason ?? "stop" }],
    usage: data.usage,
    model: data.model,
  };
}
