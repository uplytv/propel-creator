import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const { error } = await supabase.from("email_unsubscribes").upsert(
          { email },
          { onConflict: "email" }
        );
        if (error) throw error;
        // Also mark all subscriber records for this email as unsubscribed
        await supabase.from("subscribers").update({
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
        }).eq("email", email).eq("unsubscribed", false);
        setStatus("done");
      } catch {
        setStatus("error");
      }
    })();
  }, [email]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-6">📧</div>
        {!email ? (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-3">Invalid Link</h1>
            <p className="text-muted-foreground text-sm">This unsubscribe link appears to be invalid.</p>
          </>
        ) : status === "done" ? (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-3">You've been unsubscribed</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You won't receive marketing emails from UPLY anymore.<br />
              You'll still get important account emails like login links and payment receipts.
            </p>
          </>
        ) : status === "error" ? (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-3">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">Please try again or contact support@uply.tv</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-3">Unsubscribing…</h1>
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </>
        )}
        <a href="/" className="inline-block mt-8 text-primary text-sm hover:underline">
          ← Back to UPLY
        </a>
      </div>
    </div>
  );
}
