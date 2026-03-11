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
      // Set cookie
      setAffiliateCookie("uply_ref", code, 30);

      // Increment clicks via direct update (public can't update, so we'll use edge function or just set cookie)
      // The click tracking will happen server-side when they actually sign up
      // For now, navigate to auth/waitlist
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
