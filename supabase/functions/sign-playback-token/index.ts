// ─────────────────────────────────────────────────────────────────────────────
// sign-playback-token — per-viewer Mux playback JWTs for PPV content.
//
// Entitlement is NOT decided here: the SECURITY DEFINER RPC
// get_stream_playback (migration 20260706160000_ppv_access.sql) is the single
// source of truth and is invoked AS THE CALLER (anon key + the caller's
// Authorization header), so auth.uid() resolves correctly inside it. This fn
// only turns an already-authorized playback id into a short-lived signed URL.
//
// Fallback matrix:
//   * MUX_SIGNING_KEY_ID / MUX_SIGNING_PRIVATE_KEY unset → { signed: false }
//     with the playback id — client plays the plain URL (current behavior).
//   * Playback id is public-policy (all PPV streams created before the
//     signing secrets existed) → { signed: false } — plain URL keeps working.
//   * Playback id is signed-policy → { signed: true, token, thumbnail_token }.
//
// Key material comes ONLY from env and is never logged or echoed.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT } from 'https://esm.sh/jose@5.9.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const TOKEN_TTL_SECONDS = 6 * 60 * 60 // 6h — client refreshes on 403 after >5h
const VALID_REF_TYPES = ['stream', 'recording', 'asset'] as const
type RefType = (typeof VALID_REF_TYPES)[number]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s+/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Minimal DER length encoder (short + long form). */
function derLength(len: number): number[] {
  if (len < 0x80) return [len]
  const out: number[] = []
  let n = len
  while (n > 0) {
    out.unshift(n & 0xff)
    n >>= 8
  }
  return [0x80 | out.length, ...out]
}

/**
 * Wrap a PKCS#1 RSAPrivateKey DER in a PKCS#8 PrivateKeyInfo envelope so
 * WebCrypto can import it. Mux signing keys decode to a PKCS#1
 * "BEGIN RSA PRIVATE KEY" PEM; WebCrypto only accepts PKCS#8.
 */
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  // AlgorithmIdentifier: SEQUENCE { OID 1.2.840.113549.1.1.1 (rsaEncryption), NULL }
  const algId = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]
  const octetString = [0x04, ...derLength(pkcs1.length), ...Array.from(pkcs1)]
  const inner = [0x02, 0x01, 0x00, ...algId, ...octetString] // version INTEGER 0 + algId + key
  return new Uint8Array([0x30, ...derLength(inner.length), ...inner])
}

/** Import the Mux signing key (base64-encoded PEM per Mux; raw PEM tolerated). */
async function importSigningKey(envValue: string): Promise<CryptoKey> {
  const pem = envValue.includes('-----BEGIN')
    ? envValue
    : new TextDecoder().decode(base64ToBytes(envValue))
  const isPkcs1 = pem.includes('RSA PRIVATE KEY')
  const der = base64ToBytes(pem.replace(/-----[^-]+-----/g, ''))
  const pkcs8 = isPkcs1 ? pkcs1ToPkcs8(der) : der
  return await crypto.subtle.importKey(
    'pkcs8',
    pkcs8.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const traceId = crypto.randomUUID()
  const log = (step: string, detail?: Record<string, unknown>) =>
    console.log(`[sign-playback-token][${traceId}] ${step}`, detail ?? '')
  const logError = (step: string, detail?: Record<string, unknown>) =>
    console.error(`[sign-playback-token][${traceId}] ${step}`, detail ?? '')

  try {
    // ── Auth (fn does its own auth; verify_jwt=false like sibling fns) ──────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(401, { error: 'Unauthorized' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !anonKey) {
      logError('supabase_env_missing')
      return json(500, { error: 'Server misconfigured' })
    }

    // Caller-scoped client: the RPC below is SECURITY DEFINER and checks
    // auth.uid() — it must run as the viewer, never as service role.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) return json(401, { error: 'Unauthorized' })

    // ── Input ───────────────────────────────────────────────────────────────
    let body: any
    try {
      body = await req.json()
    } catch {
      return json(400, { error: 'Invalid JSON body' })
    }
    const refId = String(body?.ref_id || '')
    const refType = (body?.ref_type || 'stream') as RefType
    if (!UUID_RE.test(refId)) return json(400, { error: 'ref_id must be a UUID' })
    if (!VALID_REF_TYPES.includes(refType)) return json(400, { error: 'Invalid ref_type' })

    // ── Resolve playback id via the ONLY entitlement path ───────────────────
    const { data: playback, error: rpcError } = await userClient.rpc('get_stream_playback', {
      p_ref_id: refId,
      p_ref_type: refType,
    })
    if (rpcError) {
      logError('get_stream_playback_failed', { message: rpcError.message })
      return json(500, { error: 'Playback resolution failed' })
    }
    if (!playback?.found) return json(404, { error: 'Not found' })
    if (!playback.allowed) return json(403, { error: 'Not entitled', is_ppv: !!playback.is_ppv })
    const playbackId = playback.playback_id as string | null
    if (!playbackId) return json(404, { error: 'No playback available yet' })

    // ── Signing secrets unset → current behavior (plain playback URL) ───────
    const signingKeyId = Deno.env.get('MUX_SIGNING_KEY_ID')
    const signingPrivateKey = Deno.env.get('MUX_SIGNING_PRIVATE_KEY')
    if (!signingKeyId || !signingPrivateKey) {
      log('signed_playback_disabled', {
        reason: 'mux_signing_secrets_not_set',
        fallback: 'plain_playback_url',
        refType,
      })
      return json(200, { playback_id: playbackId, signed: false })
    }

    // ── Public-policy playback ids (pre-signing PPV streams) need no token ──
    // Policy isn't stored locally, so ask Mux. On lookup failure we mint
    // anyway: signed ids REQUIRE a token, public ids ignore an extra one.
    const muxTokenId = Deno.env.get('MUX_TOKEN_ID')
    const muxTokenSecret = Deno.env.get('MUX_TOKEN_SECRET')
    let policy: 'signed' | 'public' | 'unknown' = 'unknown'
    if (muxTokenId && muxTokenSecret) {
      try {
        const res = await fetch(
          `https://api.mux.com/video/v1/playback-ids/${encodeURIComponent(playbackId)}`,
          { headers: { Authorization: `Basic ${btoa(`${muxTokenId}:${muxTokenSecret}`)}` } },
        )
        if (res.ok) {
          const info = await res.json()
          const p = info?.data?.policy
          if (p === 'signed' || p === 'public') policy = p
        } else {
          logError('mux_policy_lookup_non_ok', { status: res.status })
        }
      } catch (e) {
        logError('mux_policy_lookup_threw', { message: e instanceof Error ? e.message : String(e) })
      }
    }
    if (policy === 'public') {
      log('public_policy_playback', { refType })
      return json(200, { playback_id: playbackId, signed: false })
    }

    // ── Mint per-viewer JWTs (video aud "v", thumbnail aud "t") ─────────────
    const key = await importSigningKey(signingPrivateKey)
    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    const mint = (aud: 'v' | 't') =>
      new SignJWT({})
        .setProtectedHeader({ alg: 'RS256', kid: signingKeyId, typ: 'JWT' })
        .setSubject(playbackId)
        .setAudience(aud)
        .setExpirationTime(exp)
        .sign(key)
    const [token, thumbnailToken] = await Promise.all([mint('v'), mint('t')])

    log('token_minted', { refType, policy, expiresInSeconds: TOKEN_TTL_SECONDS })
    return json(200, {
      playback_id: playbackId,
      token,
      thumbnail_token: thumbnailToken,
      signed: true,
      expires_at: exp,
    })
  } catch (e) {
    // Generic message only — never surface key/JWT internals.
    logError('unhandled_error', { message: e instanceof Error ? e.message : String(e) })
    return json(500, { error: 'Token signing failed' })
  }
})
