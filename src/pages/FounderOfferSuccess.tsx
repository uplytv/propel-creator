import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FinalizeResult {
  email: string | null;
  offerKey: string | null;
  offerName: string | null;
  amountFormatted: string | null;
  orderId: string | null;
  receiptUrl: string | null;
}

export default function FounderOfferSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [result, setResult] = useState<FinalizeResult>({
    email: null,
    offerKey: null,
    offerName: null,
    amountFormatted: null,
    orderId: null,
    receiptUrl: null,
  });

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
        setResult({
          email: data?.email ?? null,
          offerKey: data?.offerKey ?? null,
          offerName: data?.offerName ?? null,
          amountFormatted: data?.amountFormatted ?? null,
          orderId: data?.orderId ?? sessionId,
          receiptUrl: data?.receiptUrl ?? null,
        });
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

  const isAssisted = result.offerKey === "assisted-setup";
  const nextStepCopy = isAssisted
    ? "Check your email for the link to book your 60-min strategy call."
    : "A UPLY rep will reach out within 1 business day to schedule your kickoff call.";

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-5 py-10">
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
              Thanks for purchasing{" "}
              <span className="text-white">{result.offerName ?? "your UPLY founder service"}</span>.{" "}
              {nextStepCopy}
              {result.email && (
                <>
                  {" "}A confirmation was sent to{" "}
                  <span className="text-white">{result.email}</span>.
                </>
              )}
            </p>

            <div className="mt-7 text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-wider text-white/50 mb-3">
                Order summary
              </div>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/60">Offer</dt>
                  <dd className="text-white font-medium text-right">
                    {result.offerName ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/60">Amount paid</dt>
                  <dd className="text-[#00FF85] font-semibold text-right">
                    {result.amountFormatted ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/60">Order ID</dt>
                  <dd
                    className="text-white/80 font-mono text-xs text-right break-all max-w-[60%]"
                    title={result.orderId ?? undefined}
                  >
                    {result.orderId ?? "—"}
                  </dd>
                </div>
                {result.email && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-white/60">Receipt sent to</dt>
                    <dd className="text-white/80 text-right break-all">
                      {result.email}
                    </dd>
                  </div>
                )}
                {result.receiptUrl && (
                  <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
                    <dt className="text-white/60">Stripe receipt</dt>
                    <dd className="text-right">
                      <a
                        href={result.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00FF85] font-medium hover:underline"
                      >
                        View receipt ↗
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

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
