import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function FounderOfferSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setErrMsg("Missing checkout session ID.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "finalize-founder-offer",
          { body: { sessionId } },
        );
        if (cancelled) return;
        if (error) throw error;
        if (data?.email) setBuyerEmail(data.email);
        setState("ok");
      } catch (err: any) {
        if (cancelled) return;
        console.error("[finalize-founder-offer] failed", err);
        setErrMsg(err?.message || "Could not confirm purchase.");
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-5">
      <div className="max-w-lg w-full text-center">
        {state === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#00FF85] mx-auto" />
            <p className="mt-4 text-white/70">Confirming your purchase…</p>
          </>
        )}

        {state === "ok" && (
          <>
            <div className="w-16 h-16 rounded-full bg-[#00FF85]/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-[#00FF85]" />
            </div>
            <h1 className="font-heading text-3xl font-bold mt-5">You're in.</h1>
            <p className="text-white/70 mt-3">
              Thanks for booking your done-for-you course build. A UPLY rep will reach out{" "}
              {buyerEmail ? <>at <span className="text-white">{buyerEmail}</span></> : "by email"}{" "}
              within 1 business day to schedule your kickoff call.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#00FF85] text-black font-semibold text-sm hover:bg-[#00FF85]/90"
              >
                Go to my dashboard
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/20"
              >
                Back home
              </Link>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-9 h-9 text-amber-400" />
            </div>
            <h1 className="font-heading text-2xl font-bold mt-5">We couldn't confirm your purchase.</h1>
            <p className="text-white/70 mt-3">
              {errMsg ?? "Please contact us so we can sort it out."}
            </p>
            <p className="text-white/60 mt-2 text-sm">
              Email <a href="mailto:founders@uply.tv" className="underline hover:text-white">founders@uply.tv</a> — include your receipt and we'll take care of it.
            </p>
            <Link
              to="/founder-services"
              className="mt-6 inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/20"
            >
              Back to pricing
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
