import { assertEquals } from "jsr:@std/assert@1";
import { isAllowedOrigin, isInternalCaller, withCors } from "./security.ts";

Deno.test("CORS allowlist", () => {
  for (const o of ["https://uply.tv", "https://www.uply.tv", "https://id-preview--abc.lovable.app", "https://propel-creator-git-x.vercel.app", "http://localhost:8080", "capacitor://localhost"]) {
    assertEquals(isAllowedOrigin(o), true, o);
  }
  for (const o of ["https://evil.com", "https://uply.tv.evil.com", "https://evil-uply.tv", "https://lovable.app.evil.com", null]) {
    assertEquals(isAllowedOrigin(o as string | null), false, String(o));
  }
});

Deno.test("withCors overrides wildcard", async () => {
  const h = withCors(() => new Response("x", { headers: { "Access-Control-Allow-Origin": "*" } }));
  const ok = await h(new Request("https://f", { headers: { origin: "https://www.uply.tv" } }));
  assertEquals(ok.headers.get("Access-Control-Allow-Origin"), "https://www.uply.tv");
  const bad = await h(new Request("https://f", { headers: { origin: "https://evil.com" } }));
  assertEquals(bad.headers.get("Access-Control-Allow-Origin"), "https://uply.tv");
});

Deno.test("internal caller", () => {
  Deno.env.set("CRON_SECRET", "s3cret");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "svc");
  assertEquals(isInternalCaller(new Request("https://f")), false);
  assertEquals(isInternalCaller(new Request("https://f", { headers: { "x-cron-secret": "nope" } })), false);
  assertEquals(isInternalCaller(new Request("https://f", { headers: { "x-cron-secret": "s3cret" } })), true);
  assertEquals(isInternalCaller(new Request("https://f", { headers: { Authorization: "Bearer svc" } })), true);
  assertEquals(isInternalCaller(new Request("https://f", { headers: { Authorization: "Bearer anon" } })), false);
});
