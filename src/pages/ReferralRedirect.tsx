import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
      // Check if this is an invite code (from invite_codes table)
      const { data: invite } = await supabase
        .from("invite_codes" as any)
        .select("id, is_used")
        .eq("code", code)
        .eq("is_used", false)
        .maybeSingle() as any;

      if (invite) {
        // This is a valid invite code — save and redirect to auth
        setAffiliateCookie("uply_invite_code", code, 30);
        navigate("/auth");
        return;
      }

      // Check if this is a profile referral code
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("referral_code", code)
        .maybeSingle();

      if (profile) {
        // Waitlist referral — set cookie and redirect to auth
        setAffiliateCookie("uply_waitlist_ref", code, 30);
        navigate("/auth");
        return;
      }

      // Check old waitlist referral codes
      const isWaitlistRef = /^[A-Z0-9]{8}$/.test(code);
      if (isWaitlistRef) {
        setAffiliateCookie("uply_waitlist_ref", code, 30);
        navigate("/auth");
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
