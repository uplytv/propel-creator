import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setAffiliateCookie } from "@/lib/affiliateCookies";
import { Loader2 } from "lucide-react";

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    const handleRedirect = async () => {
      // Set cookie for attribution on signup
      setAffiliateCookie("uply_ref", code, 30);

      // Track click server-side
      try {
        await supabase.functions.invoke("track-affiliate-conversion", {
          body: {
            affiliate_code: code,
            conversion_type: "click",
          },
        });
      } catch (err) {
        console.error("Click tracking failed:", err);
      }

      navigate("/auth");
    };

    handleRedirect();
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Redirecting…</span>
      </div>
    </div>
  );
}
