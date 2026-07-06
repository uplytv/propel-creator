// Shared edge-function rate limiter — Phase 2 security hardening.
//
// Reuses the EXISTING mechanism exactly: the public.edge_function_rate_limits
// table (key text PK, call_count, window_start, updated_at) already used by
// stream-heartbeat / start-simulcast / validate-rtmp / test-simulcast-connection,
// with the same `ratelimit:${identifier}:${fnName}` key shape. Rows expire by
// window age; stale rows are reset in place on the next call (the table is
// small and self-pruning by design — see idx_rate_limits_window).
//
// FAIL-OPEN: any infrastructure error (table missing, network, etc.) returns
// `true` so a broken rate limiter can never take down checkout or ARIA.

// deno-lint-ignore no-explicit-any
type SupabaseClientLike = any;

export interface RateLimitOptions {
  /** Max calls allowed inside the window. Default 10. */
  maxCalls?: number;
  /** Window length in ms. Default 60_000 (1 minute). */
  windowMs?: number;
}

/**
 * Returns true when the call is allowed, false when the identifier has
 * exceeded `maxCalls` within `windowMs` for this function name.
 *
 * `identifier` should be a stable per-caller key: a user id for
 * authenticated endpoints, or `ip:<addr>` for anonymous ones.
 */
export async function checkEdgeRateLimit(
  supabase: SupabaseClientLike,
  identifier: string,
  fnName: string,
  opts: RateLimitOptions = {},
): Promise<boolean> {
  const maxCalls = opts.maxCalls ?? 10;
  const windowMs = opts.windowMs ?? 60_000;
  const key = `ratelimit:${identifier}:${fnName}`;
  const now = new Date();

  try {
    const { data } = await supabase
      .from("edge_function_rate_limits")
      .select("call_count, window_start")
      .eq("key", key)
      .maybeSingle();

    if (data) {
      const windowAge = now.getTime() - new Date(data.window_start).getTime();
      if (windowAge < windowMs && data.call_count >= maxCalls) return false;
      if (windowAge >= windowMs) {
        await supabase.from("edge_function_rate_limits").upsert({
          key,
          call_count: 1,
          window_start: now.toISOString(),
          updated_at: now.toISOString(),
        });
      } else {
        await supabase
          .from("edge_function_rate_limits")
          .update({ call_count: data.call_count + 1, updated_at: now.toISOString() })
          .eq("key", key);
      }
    } else {
      await supabase.from("edge_function_rate_limits").upsert({
        key,
        call_count: 1,
        window_start: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }
    return true;
  } catch (e) {
    console.error(`[rateLimit] fail-open for ${fnName}:`, (e as Error)?.message ?? e);
    return true;
  }
}

/** Best-effort client IP for anonymous rate-limit identifiers. */
export function requestIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}
