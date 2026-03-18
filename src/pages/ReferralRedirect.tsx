import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setAffiliateCookie } from "@/lib/affiliateCookies";
import { Loader2 } from "lucide-react";

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    const handleRedirect = async () => {
      // Check if this is a waitlist referral code (8 char alphanumeric)
      const isWaitlistRef = /^[A-Z0-9]{8}$/.test(code);

      if (isWaitlistRef) {
        // Waitlist referral — set waitlist cookie and redirect to waitlist page
        setAffiliateCookie("uply_waitlist_ref", code, 30);
        
        // Track click by incrementing the referrer's click count is not needed for waitlist
        // Just redirect to the waitlist application page
        navigate("/");
        return;
      }

      // Platform affiliate referral — existing behavior
      setAffiliateCookie("uply_ref", code, 30);

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
