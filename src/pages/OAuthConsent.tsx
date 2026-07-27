import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Route: /.lovable/oauth/consent
// Supabase Auth (OAuth 2.1 authorization server) redirects the user here to
// approve or deny an external OAuth client (Claude, ChatGPT, Cursor, etc.).
// This page shows the client details, then calls approve/deny and follows
// the returned redirect back to the client.
//
// The Supabase JS oauth namespace is beta — types may not surface via TS, so
// we access it through a small local cast.
const authOauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
    approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
    denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve the FULL consent URL so /auth returns the user here.
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await authOauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await authOauth.approveAuthorization(authorizationId)
      : await authOauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card/50 p-8">
          <h1 className="text-xl font-bold mb-2">Authorization error</h1>
          <p className="text-sm text-foreground/70">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
        <p className="text-sm text-foreground/70">Loading…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an external app";
  const scopes: string[] = details.scopes ?? details.requested_scopes ?? [];

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card/50 p-8">
        <h1 className="text-2xl font-display font-bold mb-2">Connect {clientName} to UPLY</h1>
        <p className="text-sm text-foreground/70 mb-6">
          This will let <strong>{clientName}</strong> use UPLY as you — reading and writing to your account
          through the UPLY MCP tools (profile, products, posts).
        </p>
        {scopes.length > 0 && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wide text-foreground/50 mb-2">Requested scopes</div>
            <ul className="text-sm text-foreground/80 space-y-1">
              {scopes.map((s) => (
                <li key={s} className="font-mono">{s}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 h-11 rounded-lg font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#3D7CFF 0%,#B025FF 100%)" }}
          >
            {busy ? "Working…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 h-11 rounded-lg font-semibold border border-border/60 text-foreground/80 disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </main>
  );
}
