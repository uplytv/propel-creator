// Shared security helpers for edge functions (security batch 1).
//
//  - CORS allowlist (uply.tv, www.uply.tv, *.lovable.app, *.vercel.app, localhost)
//  - requireUser():     verify the caller's Supabase JWT
//  - requireInternal(): cron / server-to-server callers (x-cron-secret == CRON_SECRET,
//                       or Authorization: Bearer <service role key>)
//  - strictRateLimit(): like checkEdgeRateLimit but FAILS CLOSED
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_EXACT = new Set(["https://uply.tv", "https://www.uply.tv"]);
const ALLOWED_PATTERNS = [
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i,
  // Capacitor native shells
  /^capacitor:\/\/localhost$/i,
  /^https?:\/\/localhost$/i,
];

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const extra = (Deno.env.get("CORS_EXTRA_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ALLOWED_EXACT.has(origin) || extra.includes(origin)) return true;
  return ALLOWED_PATTERNS.some((re) => re.test(origin));
}

/** Allow-Origin value for a request: the request origin if allowlisted, else the canonical site. */
export function allowOriginFor(req: Request): string {
  const origin = req.headers.get("origin");
  return isAllowedOrigin(origin) ? origin! : "https://uply.tv";
}

export const CORS_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-idempotency-key, x-cron-secret";

export function corsHeadersFor(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowOriginFor(req),
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    Vary: "Origin",
  };
}

type Handler = (req: Request, ...rest: any[]) => Response | Promise<Response>;

/**
 * Wrap a serve() handler so every response (including OPTIONS and errors) carries
 * allowlisted CORS headers. Any Access-Control-Allow-Origin the handler set is
 * overwritten, so legacy `"*"` values never leak out.
 */
export function withCors(handler: Handler): Handler {
  return async (req: Request, ...rest: any[]) => {
    const res = await handler(req, ...rest);
    const cors = corsHeadersFor(req);
    try {
      for (const [k, v] of Object.entries(cors)) {
        if (k === "Access-Control-Allow-Headers" && res.headers.has(k)) {
          // keep handler-specific headers but make sure ours are included
          const merged = new Set(
            `${res.headers.get(k)}, ${v}`.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
          );
          res.headers.set(k, [...merged].join(", "));
        } else {
          res.headers.set(k, v);
        }
      }
      return res;
    } catch {
      // immutable headers (e.g. proxied fetch response): rebuild
      const h = new Headers(res.headers);
      for (const [k, v] of Object.entries(cors)) h.set(k, v);
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    }
  };
}

export function jsonResponse(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

function bearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** True if the caller is a trusted internal caller (cron secret or service-role key). */
export function isInternalCaller(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (cronSecret && provided && timingSafeEqual(provided, cronSecret)) return true;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = bearer(req);
  if (serviceKey && token && timingSafeEqual(token, serviceKey)) return true;
  return false;
}

/** Returns a 401 Response unless the caller is internal; null when allowed. */
export function requireInternal(req: Request): Response | null {
  if (isInternalCaller(req)) return null;
  return jsonResponse(req, { error: "Unauthorized" }, 401);
}

export interface AuthedUser {
  id: string;
  email?: string | null;
}

/** Verify the caller's Supabase JWT. Returns the user or a 401 Response. */
export async function requireUser(req: Request): Promise<{ user: AuthedUser } | { response: Response }> {
  const token = bearer(req);
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || (anonKey && token === anonKey)) {
    return { response: jsonResponse(req, { error: "Unauthorized" }, 401) };
  }
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, anonKey ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return { response: jsonResponse(req, { error: "Unauthorized" }, 401) };
    return { user: { id: data.user.id, email: data.user.email } };
  } catch {
    return { response: jsonResponse(req, { error: "Unauthorized" }, 401) };
  }
}

/**
 * Rate limiter that FAILS CLOSED: any infra error denies the call.
 * Use for endpoints that spend money (AI, email, video).
 */
// deno-lint-ignore no-explicit-any
export async function strictRateLimit(
  supabase: any,
  identifier: string,
  fnName: string,
  maxCalls: number,
  windowMs: number,
): Promise<boolean> {
  const key = `ratelimit:${identifier}:${fnName}`;
  const now = new Date();
  try {
    const { data, error } = await supabase
      .from("edge_function_rate_limits")
      .select("call_count, window_start")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const age = now.getTime() - new Date(data.window_start).getTime();
      if (age < windowMs) {
        if (data.call_count >= maxCalls) return false;
        const { error: e2 } = await supabase
          .from("edge_function_rate_limits")
          .update({ call_count: data.call_count + 1, updated_at: now.toISOString() })
          .eq("key", key);
        if (e2) throw e2;
        return true;
      }
    }
    const { error: e3 } = await supabase.from("edge_function_rate_limits").upsert({
      key,
      call_count: 1,
      window_start: now.toISOString(),
      updated_at: now.toISOString(),
    });
    if (e3) throw e3;
    return true;
  } catch (e) {
    console.error(`[strictRateLimit] fail-closed for ${fnName}:`, (e as Error)?.message ?? e);
    return false;
  }
}

export function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}
