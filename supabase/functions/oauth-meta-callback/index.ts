// Meta OAuth — Callback
// Exchanges the auth code for a long-lived token, fetches account metadata,
// encrypts the token with AES-GCM, and upserts into ad_connections.
//
// IMPORTANT: This function uses verify_jwt = false because Meta hits it directly
// (the user is not in our app context at callback time). User identity comes from
// the signed `state` parameter we created in oauth-meta-start.
//
// Required Supabase secrets:
//   META_APP_ID, META_APP_SECRET, META_REDIRECT_URI, AD_TOKEN_ENCRYPTION_KEY
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { withCors } from "../_shared/security.ts";

// AES-GCM encryption helpers (32-byte key from secret)
async function importKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("AD_TOKEN_ENCRYPTION_KEY");
  if (!raw) throw new Error("AD_TOKEN_ENCRYPTION_KEY not set");
  // Accept hex (64 chars) or base64 (44 chars) or raw 32 chars
  let bytes: Uint8Array;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    bytes = new Uint8Array(raw.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  } else {
    try {
      const b = atob(raw);
      bytes = new Uint8Array([...b].map((c) => c.charCodeAt(0)));
    } catch {
      bytes = new TextEncoder().encode(raw);
    }
  }
  if (bytes.length < 32) {
    // Pad / hash to 32 bytes
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    bytes = new Uint8Array(hash);
  } else if (bytes.length > 32) {
    bytes = bytes.slice(0, 32);
  }
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptToken(plain: string): Promise<string> {
  if (!plain) return plain;
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plain),
    ),
  );
  // Format: v1:<base64(iv)>:<base64(ct)>
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return `v1:${b64(iv)}:${b64(ct)}`;
}

function htmlClose(success: boolean, message: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>UPLY · Meta OAuth</title>
<style>body{margin:0;background:#0A0A0A;color:#fff;font-family:'Plus Jakarta Sans',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px}
.box{max-width:420px} .ok{color:#00FF85} .err{color:#ff5566}
h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:22px;margin:0 0 12px}
p{color:rgba(255,255,255,.65);font-size:14px;line-height:1.5}</style></head>
<body><div class="box">
<h1 class="${success ? "ok" : "err"}">${success ? "✓ Connected" : "✗ Connection failed"}</h1>
<p>${message}</p>
<p style="margin-top:24px;color:rgba(255,255,255,.4);font-size:12px">You can close this window.</p>
</div>
<script>
  try { window.opener && window.opener.postMessage({ type: 'uply:oauth', provider: 'meta', success: ${success} }, '*'); } catch(e){}
  setTimeout(() => { try { window.close(); } catch(e){} }, 1500);
</script>
</body></html>`;
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (error) {
    return new Response(htmlClose(false, error), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  if (!code || !state) {
    return new Response(htmlClose(false, "Missing code or state."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  let userId: string;
  try {
    const parsed = JSON.parse(atob(state));
    userId = parsed.uid;
    if (!userId || typeof userId !== "string") throw new Error("bad state");
    // Reject states older than 15 minutes
    if (Date.now() - parsed.t > 15 * 60 * 1000) throw new Error("state expired");
  } catch (_e) {
    return new Response(htmlClose(false, "Invalid OAuth state."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");
  const redirectUri = Deno.env.get("META_REDIRECT_URI");

  if (!appId || !appSecret || !redirectUri) {
    return new Response(
      htmlClose(false, "Meta app credentials are not configured yet."),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  try {
    // 1. Short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const shortRes = await fetch(tokenUrl.toString());
    const shortJson = await shortRes.json();
    if (!shortRes.ok || !shortJson.access_token) {
      throw new Error(shortJson.error?.message || "Token exchange failed");
    }

    // 2. Long-lived (60d) token
    const longUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", appId);
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("fb_exchange_token", shortJson.access_token);
    const longRes = await fetch(longUrl.toString());
    const longJson = await longRes.json();
    const accessToken: string = longJson.access_token || shortJson.access_token;
    const expiresIn: number = longJson.expires_in || shortJson.expires_in || 60 * 60 * 24 * 60;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3. Fetch metadata in parallel
    const [adAcctsRes, pagesRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}`,
      ),
      fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${accessToken}`,
      ),
    ]);
    const adAccts = await adAcctsRes.json();
    const pages = await pagesRes.json();

    const account_data = {
      ad_accounts: adAccts.data || [],
      pages: pages.data || [],
      ig_accounts:
        (pages.data || [])
          .filter((p: any) => p.instagram_business_account)
          .map((p: any) => ({ ...p.instagram_business_account, page_id: p.id })) || [],
      pixels: [], // populated when an ad account is selected
      fetched_at: new Date().toISOString(),
    };

    // 4. Encrypt and upsert
    const encryptedToken = await encryptToken(accessToken);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upsertErr } = await admin
      .from("ad_connections")
      .upsert(
        {
          user_id: userId,
          provider: "meta",
          access_token: encryptedToken,
          refresh_token: null,
          expires_at: expiresAt,
          scopes: [
            "ads_management",
            "ads_read",
            "business_management",
            "pages_show_list",
            "pages_read_engagement",
            "instagram_basic",
            "instagram_manage_insights",
          ],
          account_data,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );

    if (upsertErr) throw upsertErr;

    return new Response(htmlClose(true, "Your Meta account is now linked to UPLY."), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    return new Response(htmlClose(false, String((e as Error).message || e)), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}));
