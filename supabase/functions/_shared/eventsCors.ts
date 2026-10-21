// Shared CORS + helpers for Events/Tickets/Live Commerce edge functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-idempotency-key",
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const err = (message: string, status = 400, extra?: Record<string, unknown>) =>
  json({ error: message, ...(extra ?? {}) }, status);

export async function logError(
  supabase: any,
  function_name: string,
  error: unknown,
  payload?: unknown,
  user_id?: string | null,
) {
  try {
    const e = error as any;
    await supabase.from("error_log").insert({
      function_name,
      user_id: user_id ?? null,
      error_message: e?.message ?? String(error),
      stack: e?.stack ?? null,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
    });
  } catch (_) {
    // swallow — logging must never break the response
  }
}

// Retry with jitter (3 attempts: 500ms, 2s, 8s)
export async function withRetry<T>(fn: () => Promise<T>, label = "op"): Promise<T> {
  const delays = [500, 2000, 8000];
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < 2) {
        const jitter = Math.floor(Math.random() * 200);
        await new Promise((r) => setTimeout(r, delays[i] + jitter));
      }
    }
  }
  console.error(`[${label}] failed after 3 attempts`, lastErr);
  throw lastErr;
}

export const PLATFORM_FEE_PCT = 0.05; // 5% UPLY fee
