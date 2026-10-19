import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import ts from "npm:typescript@5.8.3";
import { constantTimeEqual } from "./constantTime.ts";
import { signMetaState, verifyMetaState } from "./metaOAuthState.ts";
import { isAuthorizedCron } from "./cronAuth.ts";
import { checkEdgeRateLimit } from "./rateLimit.ts";
import { isPrivateAddress, validatePublicUrl, fetchPublicPage } from "../import-from-url/urlGuard.ts";

// Isolated handler harness: transpile only the target file, inject mocked SDK
// dependencies, and capture its registered handler. No real emails or DB writes.
async function loadHandler(name: string, client: unknown, extra: Record<string, unknown> = {}) {
  const source = await Deno.readTextFile(new URL(`../${name}/index.ts`, import.meta.url));
  let handler: (req: Request) => Promise<Response> = async () => { throw new Error("not registered"); };
  const register = (value: typeof handler) => { handler = value; };
  const deps = { createClient: () => client, serve: register, constantTimeEqual, isAuthorizedCron,
    checkEdgeRateLimit, fetchPublicPage, ...extra };
  const compiled = ts.transpileModule(source.replace(/^import .*;\n/gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  new Function("Deno", ...Object.keys(deps), compiled)(
    { ...Deno, serve: register }, ...Object.values(deps));
  return handler;
}

function request(body: unknown, authorization?: string) {
  return new Request("https://example.com/function", { method: "POST",
    headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
    body: JSON.stringify(body) });
}

function testEnv() {
  Deno.env.set("SUPABASE_URL", "https://example.com");
  Deno.env.set("SUPABASE_ANON_KEY", "test-anon");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service");
  Deno.env.set("ANTHROPIC_API_KEY", "test-ai");
}

Deno.test("secret comparison rejects altered and different-length values", async () => {
  assert(await constantTimeEqual("secret", "secret"));
  assert(!await constantTimeEqual("secret", "secreu"));
  assert(!await constantTimeEqual("secret", "secret-long"));
});

Deno.test("Meta HMAC accepts authentic state and rejects forged identity or key", async () => {
  const payload = { uid: "creator-1", n: "nonce", t: Date.now() };
  const state = await signMetaState(payload, "test-state-key");
  assertEquals((await verifyMetaState(state, "test-state-key")).uid, "creator-1");
  const forged = await signMetaState({ ...payload, uid: "victim" }, "attacker-key");
  await assertRejects(() => verifyMetaState(forged, "test-state-key"));
  await assertRejects(() => verifyMetaState(state.split(".")[0] + ".forged", "test-state-key"));
  await assertRejects(() => verifyMetaState(btoa(JSON.stringify(payload)), "test-state-key"));
});

Deno.test("Meta state expires after 15 minutes", async () => {
  const now = Date.now();
  const original = Date.now;
  const state = await signMetaState({ uid: "creator", n: "nonce", t: now }, "test-key");
  try {
    Date.now = () => now + 15 * 60_000;
    assertEquals((await verifyMetaState(state, "test-key")).uid, "creator");
    Date.now = () => now + 15 * 60_000 + 1;
    await assertRejects(() => verifyMetaState(state, "test-key"));
  } finally { Date.now = original; }
});

Deno.test("cron rollout allows with warning when secret absent and rejects anonymous when set", async () => {
  testEnv();
  const client = { auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    rpc: async () => ({ data: false, error: null }) };
  Deno.env.delete("INTERNAL_CRON_SECRET");
  const warn = console.warn;
  let warning = "";
  console.warn = (message: string) => { warning = message; };
  try { assert(await isAuthorizedCron(request({}), client)); }
  finally { console.warn = warn; }
  assertEquals(warning, "cronAuth: INTERNAL_CRON_SECRET not set, allowing unauthenticated call");
  Deno.env.set("INTERNAL_CRON_SECRET", "test-cron");
  assert(!await isAuthorizedCron(request({}), client));
  assert(!await isAuthorizedCron(request({}, "Bearer wrong"), client));
});

Deno.test("cron accepts matching cron secret, service key, or verified admin only", async () => {
  testEnv(); Deno.env.set("INTERNAL_CRON_SECRET", "test-cron");
  let role = false;
  const client = { auth: { getUser: async (token: string) => ({
    data: { user: token === "valid-user" ? { id: "admin-1" } : null }, error: null }) },
    rpc: async (name: string, args: Record<string, string>) => {
      assertEquals(name, "has_role"); assertEquals(args, { _user_id: "admin-1", _role: "admin" });
      return { data: role, error: null };
    } };
  const cronReq = request({}); cronReq.headers.set("x-cron-secret", "test-cron");
  assert(await isAuthorizedCron(cronReq, client));
  assert(await isAuthorizedCron(request({}, "Bearer test-service"), client));
  assert(!await isAuthorizedCron(request({}, "Bearer valid-user"), client));
  role = true;
  assert(await isAuthorizedCron(request({}, "Bearer valid-user"), client));
});

for (const name of ["refresh-trending-scores", "simulate-campaigns", "check-event-reminders",
  "process-waitlist-expiry", "reveal-virtual-link", "release-expired-ticket-holds"]) {
  Deno.test(`${name} returns 401 before work when cron enforcement is enabled`, async () => {
    testEnv(); Deno.env.set("INTERNAL_CRON_SECRET", "test-cron");
    const handler = await loadHandler(name, { auth: {}, rpc: () => { throw new Error("unexpected write"); } });
    const response = await handler(request({}));
    assertEquals(response.status, 401);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
    assertEquals((await handler(new Request("https://example.com", { method: "OPTIONS" }))).status, 200);
  });
}

Deno.test("weekly email rejects anonymous and wrong service credentials without writes", async () => {
  testEnv(); const handler = await loadHandler("send-weekly-report-email", {});
  for (const auth of [undefined, "Bearer wrong", "Bearer test-service-long"]) {
    const response = await handler(request({}, auth));
    assertEquals(response.status, 401);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  }
});

const report = { recipientEmail: "creator@example.com", summary: "Summary", displayName: "Creator",
  actionItem: "Action", highlights: [{ label: "Revenue", insight: "Review" }], weekStart: "2026-10-12", weekEnd: "2026-10-19" };

for (const [rule, patch] of Object.entries({
  "email format": { recipientEmail: "invalid" },
  "254-character email cap": { recipientEmail: "a".repeat(243) + "@example.com" },
  "2000-character summary cap": { summary: "s".repeat(2001) },
  "500-character name cap": { displayName: "n".repeat(501) },
  "500-character action cap": { actionItem: "a".repeat(501) },
  "10-highlight cap": { highlights: Array(11).fill({ label: "x", insight: "y" }) },
  "500-character highlight label cap": { highlights: [{ label: "x".repeat(501), insight: "y" }] },
  "500-character highlight insight cap": { highlights: [{ label: "x", insight: "y".repeat(501) }] },
})) {
  Deno.test(`weekly email enforces ${rule}`, async () => {
    testEnv(); const handler = await loadHandler("send-weekly-report-email", {});
    assertEquals((await handler(request({ ...report, ...patch }, "Bearer test-service"))).status, 400);
  });
}

Deno.test("weekly email escapes malicious fields before enqueueing", async () => {
  testEnv(); let queued: Record<string, unknown> = {};
  const chain = { select: () => chain, eq: () => chain, is: () => chain,
    maybeSingle: async () => ({ data: { token: 'token" onclick="bad' } }), insert: async () => ({ error: null }) };
  const client = { from: () => chain, rpc: async (_: string, args: { payload: Record<string, unknown> }) => {
    queued = args.payload; return { error: null };
  } };
  const handler = await loadHandler("send-weekly-report-email", client);
  const attack = '<img src=x onerror="bad">&\'';
  const response = await handler(request({ ...report, displayName: attack, summary: attack,
    actionItem: attack, highlights: [{ label: attack, insight: attack }] }, "Bearer test-service"));
  assertEquals(response.status, 200);
  const html = String(queued.html);
  assert(!html.includes(attack));
  assertEquals(html.split('&lt;img src=x onerror=&quot;bad&quot;&gt;&amp;&#39;').length - 1, 5);
  assert(html.includes('token=token&quot; onclick=&quot;bad&amp;type='));
});

for (const [name, maxCalls] of [["import-from-url", 10], ["generate-product-copy", 20], ["match-talent", 20]] as const) {
  Deno.test(`${name} requires a valid signed-in user`, async () => {
    testEnv();
    const handler = await loadHandler(name, { auth: { getUser: async () => ({ data: { user: null }, error: null }) } });
    assertEquals((await handler(request({}))).status, 401);
    assertEquals((await handler(request({}, "Bearer invalid"))).status, 401);
  });
  Deno.test(`${name} enforces ${maxCalls} calls per 10 minutes per verified user`, async () => {
    testEnv(); let rateKey = "";
    const chain = { select: () => chain, eq: (_: string, key: string) => { rateKey = key; return chain; },
      maybeSingle: async () => ({ data: { call_count: maxCalls, window_start: new Date().toISOString() } }) };
    const client = { auth: { getUser: async () => ({ data: { user: { id: "verified" } }, error: null }) }, from: () => chain };
    const handler = await loadHandler(name, client);
    assertEquals((await handler(request({}, "Bearer valid"))).status, 429);
    assertEquals(rateKey, `ratelimit:verified:${name}`);
    let updates = 0;
    const expired = { ...chain, select: () => expired, eq: () => expired,
      maybeSingle: async () => ({ data: { call_count: maxCalls, window_start: new Date(Date.now() - 600_001).toISOString() } }),
      upsert: async () => { updates++; } };
    assert(await checkEdgeRateLimit({ from: () => expired }, "verified", name, { maxCalls, windowMs: 600_000 }));
    assertEquals(updates, 1);
  });
}

Deno.test("heartbeat ignores body user_id and scopes queries/rate limits to verified caller", async () => {
  testEnv(); const keys: string[] = [];
  const chain = { select: () => chain, eq: (_: string, id: string) => { keys.push(id); return chain; },
    maybeSingle: async () => ({ data: null }), upsert: async () => ({}), in: async () => ({ data: [] }) };
  const client = { auth: { getUser: async () => ({ data: { user: { id: "verified" } }, error: null }) }, from: () => chain };
  const handler = await loadHandler("stream-heartbeat", client);
  const response = await handler(request({ user_id: "victim", session_id: null }, "Bearer valid"));
  assertEquals(response.status, 200);
  assertEquals(keys, ["ratelimit:verified:stream-heartbeat", "verified"]);
});

Deno.test("heartbeat rejects missing or invalid JWT", async () => {
  testEnv(); const handler = await loadHandler("stream-heartbeat", {
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  });
  assertEquals((await handler(request({ user_id: "victim" }))).status, 401);
  assertEquals((await handler(request({ user_id: "victim" }, "Bearer invalid"))).status, 401);
});

for (const ip of ["127.9.8.7", "10.1.2.3", "172.16.0.1", "172.31.255.1", "192.168.1.1",
  "169.254.169.254", "0.0.0.0", "::1", "fc00::1", "fdff::1", "fe80::1", "febf::1", "::ffff:127.0.0.1", "::ffff:a00:1"]) {
  Deno.test(`URL guard blocks private address ${ip}`, () => assert(isPrivateAddress(ip)));
}

Deno.test("URL guard rejects private hosts, invalid protocols, and encoded loopback", async () => {
  for (const value of ["file:///etc/passwd", "https://localhost", "https://a.local", "https://a.internal",
    "http://2130706433", "http://127.1", "http://[::ffff:7f00:1]", "https://LOCALHOST."]) {
    await assertRejects(() => validatePublicUrl(value));
  }
  for (const ip of ["8.8.8.8", "172.15.1.1", "172.32.1.1", "2001:4860:4860::8888"]) assert(!isPrivateAddress(ip));
});

Deno.test("URL guard checks both DNS record families and rejects any private answer", async () => {
  const original = Deno.resolveDns;
  const types: string[] = [];
  try {
    Deno.resolveDns = ((_: string, type: string) => { types.push(type); return Promise.resolve(type === "A" ? ["8.8.8.8"] : ["::1"]); }) as typeof Deno.resolveDns;
    await assertRejects(() => validatePublicUrl("https://public.example.com"));
    assertEquals(types.sort(), ["A", "AAAA"]);
  } finally { Deno.resolveDns = original; }
});

Deno.test("URL fetch revalidates redirects and permits at most three hops", async () => {
  const original = globalThis.fetch; let calls = 0;
  try {
    globalThis.fetch = async (_input, options) => {
      calls++; assertEquals(options?.redirect, "manual");
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1" } });
    };
    await assertRejects(() => fetchPublicPage("http://8.8.8.8")); assertEquals(calls, 1);
    calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(null, { status: 302, headers: { location: "http://8.8.8.8" } }); };
    await assertRejects(() => fetchPublicPage("http://8.8.8.8")); assertEquals(calls, 4);
  } finally { globalThis.fetch = original; }
});

Deno.test("URL fetch truncates streaming response to 1 MB", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("x".repeat(2 * 1024 * 1024));
    assertEquals((await fetchPublicPage("http://8.8.8.8")).length, 1024 * 1024);
  } finally { globalThis.fetch = original; }
});

Deno.test("URL fetch uses an eight-second abort deadline", async () => {
  const originalFetch = globalThis.fetch; const originalTimeout = globalThis.setTimeout;
  let delay = 0;
  try {
    globalThis.setTimeout = ((callback: () => void, ms: number) => { delay = ms; return originalTimeout(callback, 1); }) as typeof setTimeout;
    globalThis.fetch = async (_input, options) => new Promise((_, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    await assertRejects(() => fetchPublicPage("http://8.8.8.8")); assertEquals(delay, 8000);
  } finally { globalThis.fetch = originalFetch; globalThis.setTimeout = originalTimeout; }
});