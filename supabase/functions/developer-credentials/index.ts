// Developer API credentials, generated server-side (security batch 1, item 6).
//
// POST { action: "create_key", name }                 -> { id, key, key_prefix }   (key shown ONCE)
// POST { action: "create_webhook", url, events[] }    -> { id, secret }            (secret shown ONCE)
//
// API keys: only a SHA-256 hash + display prefix are stored.
// Webhook secrets: stored encrypted in Supabase Vault (api_webhooks.secret_id);
// the plaintext column is never written. Clients cannot INSERT into either table.
import { jsonResponse, requireUser, serviceClient, strictRateLimit, withCors } from "../_shared/security.ts";

const ALLOWED_EVENTS = new Set([
  "stream.started", "stream.ended", "purchase.completed", "subscription.created",
  "subscription.cancelled", "tip.received", "member.joined",
]);

function randomToken(bytes = 24): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(s: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const userId = auth.user.id;
  const db = serviceClient();

  if (!(await strictRateLimit(db, `user:${userId}`, "developer-credentials", 20, 10 * 60_000))) {
    return jsonResponse(req, { error: "Too many requests" }, 429);
  }

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse(req, { error: "Invalid JSON" }, 400); }

  try {
    if (body?.action === "create_key") {
      const name = String(body.name ?? "").trim().slice(0, 100);
      if (!name) return jsonResponse(req, { error: "Name required" }, 400);
      const key = `sk_live_${randomToken(24)}`;
      const key_prefix = key.substring(0, 16);
      const { data, error } = await db.from("api_keys")
        .insert({ user_id: userId, name, key_hash: await sha256Hex(key), key_prefix })
        .select("id").single();
      if (error) throw error;
      return jsonResponse(req, { id: data.id, key, key_prefix });
    }

    if (body?.action === "create_webhook") {
      const url = String(body.url ?? "").trim();
      let parsed: URL;
      try { parsed = new URL(url); } catch { return jsonResponse(req, { error: "Invalid URL" }, 400); }
      if (parsed.protocol !== "https:") return jsonResponse(req, { error: "Webhook URL must use https" }, 400);
      const events = Array.isArray(body.events) ? body.events.map(String).filter((e: string) => ALLOWED_EVENTS.has(e)) : [];
      if (!events.length) return jsonResponse(req, { error: "Select at least one event" }, 400);

      const secret = `whsec_${randomToken(24)}`;
      const { data, error } = await db.rpc("create_api_webhook_with_secret", {
        _user_id: userId, _url: url, _events: events, _secret: secret,
      });
      if (error) throw error;
      return jsonResponse(req, { id: data, secret });
    }

    return jsonResponse(req, { error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[developer-credentials]", (e as Error)?.message ?? e);
    return jsonResponse(req, { error: "Failed" }, 500);
  }
}));
