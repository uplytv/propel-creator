import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-viewer Mux signed-playback token for paid uploads (lessons / assets).
 * sign-playback-token checks entitlement server-side and returns
 * { signed: false } for public-policy playback ids, in which case the plain
 * URL is used. Tokens live 6h; `refresh` re-mints (guarded to once per minute).
 */
export function useSignedPlaybackToken(refId: string | null | undefined, refType: "lesson" | "asset", enabled = true) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(!enabled);
  const [forbidden, setForbidden] = useState(false);
  const lastMint = useRef(0);

  const mint = useCallback(async () => {
    if (!refId || !enabled) { setReady(true); return; }
    lastMint.current = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke("sign-playback-token", {
        body: { ref_id: refId, ref_type: refType },
      });
      if (error) {
        const status = (error as { context?: { status?: number } })?.context?.status;
        if (status === 403) setForbidden(true);
        setToken(null);
      } else {
        setForbidden(false);
        setToken(data?.signed && data?.token ? (data.token as string) : null);
      }
    } catch {
      setToken(null);
    } finally {
      setReady(true);
    }
  }, [refId, refType, enabled]);

  useEffect(() => { setReady(!enabled); void mint(); }, [mint, enabled]);

  const refresh = useCallback(() => {
    if (Date.now() - lastMint.current > 60_000) void mint();
  }, [mint]);

  return { token, ready, forbidden, refresh };
}
