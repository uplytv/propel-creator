import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVerifyBoostPayment } from "@/hooks/useBoosts";

export default function BoostSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const navigate = useNavigate();
  const verify = useVerifyBoostPayment();
  const [status, setStatus] = useState<"loading" | "active" | "error">("loading");

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    verify.mutateAsync(sessionId)
      .then((r) => setStatus(r?.status === "active" ? "active" : "loading"))
      .catch(() => setStatus("error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Activating your boost…</h1>
          </>
        )}
        {status === "active" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 justify-center">
              <Rocket className="w-5 h-5" /> Boost active!
            </h1>
            <p className="text-muted-foreground">
              Your content is now promoted in the Discover feed. Track performance from your dashboard.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={() => navigate("/discover")}>Go to Discover</Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">We couldn't verify your boost payment.</p>
            <Button onClick={() => navigate("/discover")}>Back to Discover</Button>
          </>
        )}
      </div>
    </div>
  );
}
