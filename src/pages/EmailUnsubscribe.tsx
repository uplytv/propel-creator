import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "confirming" | "done" | "error";

export default function EmailUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already_unsubscribed"); return; }
        if (data.valid) { setStatus("valid"); return; }
        setStatus("invalid");
      } catch { setStatus("error"); }
    })();
  }, [token]);

  const handleConfirm = useCallback(async () => {
    setStatus("confirming");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      if (data?.success) { setStatus("done"); return; }
      if (data?.reason === "already_unsubscribed") { setStatus("already_unsubscribed"); return; }
      setStatus("error");
    } catch { setStatus("error"); }
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Verifying…</p>
          </>
        )}
        {status === "valid" && (
          <>
            <MailX className="h-14 w-14 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Unsubscribe from emails?</h1>
            <p className="text-muted-foreground">You'll stop receiving app emails from UPLY. Auth emails (password reset, etc.) are not affected.</p>
            <Button onClick={handleConfirm} variant="destructive" size="lg" className="w-full">
              Confirm Unsubscribe
            </Button>
          </>
        )}
        {status === "confirming" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Processing…</p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle className="h-14 w-14 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">You've been unsubscribed</h1>
            <p className="text-muted-foreground">You won't receive any more app emails from UPLY.</p>
          </>
        )}
        {status === "already_unsubscribed" && (
          <>
            <CheckCircle className="h-14 w-14 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Already unsubscribed</h1>
            <p className="text-muted-foreground">You were already unsubscribed from UPLY emails.</p>
          </>
        )}
        {status === "invalid" && (
          <>
            <AlertCircle className="h-14 w-14 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Invalid link</h1>
            <p className="text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-14 w-14 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">Please try again later or contact support.</p>
          </>
        )}
      </div>
    </div>
  );
}
