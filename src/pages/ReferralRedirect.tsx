import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setAffiliateCookie } from "@/lib/affiliateCookies";
import { Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function ReferralRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    const handleRedirect = async () => {
      // Try to get referrer name for SEO
      const { data: refProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("referral_code", code)
        .maybeSingle();
      if (refProfile?.display_name) setReferrerName(refProfile.display_name);

      // Check if this is an invite code (from invite_codes table)
      const { data: invite } = await supabase
        .from("invite_codes" as any)
        .select("id, is_used, owner_id")
        .eq("code", code)
        .eq("is_used", false)
        .maybeSingle() as any;

      if (invite) {
        if (!refProfile) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", invite.owner_id)
            .maybeSingle();
          if (ownerProfile?.display_name) setReferrerName(ownerProfile.display_name);
        }
        setAffiliateCookie("uply_invite_code", code, 30);
        navigate("/auth");
        return;
      }

      // Check if this is a profile referral code
      if (refProfile) {
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
      {referrerName && (
        <SEOHead
          title={`${referrerName} invited you to join UPLY`}
          description={`Join ${referrerName}'s community on UPLY — where creators get paid.`}
        />
      )}
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Redirecting…</span>
      </div>
    </div>
  );
}