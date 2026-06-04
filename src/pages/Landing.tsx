import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

import HomepageNav from "@/components/landing/v2/HomepageNav";
import HomepageHero from "@/components/landing/v2/HomepageHero";
import HomepageMusicians from "@/components/landing/v2/HomepageMusicians";
import HomepageStreamers from "@/components/landing/v2/HomepageStreamers";
import HomepageEducators from "@/components/landing/v2/HomepageEducators";
import HomepageLiveCommerce from "@/components/landing/v2/HomepageLiveCommerce";
import HomepageEvents from "@/components/landing/v2/HomepageEvents";
import HomepageTV from "@/components/landing/v2/HomepageTV";
import HomepageCultural from "@/components/landing/v2/HomepageCultural";
import HomepageB2B from "@/components/landing/v2/HomepageB2B";
import HomepagePricing from "@/components/landing/v2/HomepagePricing";
import HomepageFinalCTA from "@/components/landing/v2/HomepageFinalCTA";
import HomepageFooter from "@/components/landing/v2/HomepageFooter";
import FoundersStickyCTA from "@/components/founders/FoundersStickyCTA";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "UPLY",
  url: "https://uply.tv",
  description:
    "Stream, teach, sell, and build community. Keep 95% of everything. The first creator platform on Roku TV.",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web",
  creator: { "@type": "Organization", name: "UPLY" },
};

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Redirect authenticated users away from landing
  useEffect(() => {
    if (authLoading || !user) return;
    const redirect = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete, is_approved")
        .eq("user_id", user.id)
        .single();
      const p = profile as any;
      if (p?.is_approved) {
        navigate("/discover", { replace: true });
      } else if (!p?.onboarding_complete) {
        navigate("/apply", { replace: true });
      } else {
        navigate("/waitlist", { replace: true });
      }
    };
    redirect();
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased scroll-smooth">
      <SEOHead
        title="UPLY — The Creator Operating System"
        description="Stream, teach, sell, and build community. Keep 95% of everything. The first creator platform on Roku TV."
        canonicalUrl="https://uply.tv/"
        jsonLd={JSON_LD}
      />

      <HomepageNav />

      <main>
        <HomepageHero />
        <HomepageMusicians />
        <HomepageStreamers />
        <HomepageEducators />
        <HomepageLiveCommerce />
        <HomepageEvents />
        <HomepageTV />
        <HomepageCultural />
        <HomepageB2B />
        <HomepagePricing />
        <HomepageFinalCTA />
      </main>

      <HomepageFooter />
      <FoundersStickyCTA />
    </div>
  );
}
