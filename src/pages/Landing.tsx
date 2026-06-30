import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { LANDING_OG_IMAGE_URL } from "@/lib/ogImage";

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
import FeaturedRails from "@/components/FeaturedRails";
import RosterArtistsRail from "@/components/discover/RosterArtistsRail";
import FeaturedCreatorsSection from "@/components/landing/FeaturedCreatorsSection";

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

/**
 * A whisper-thin gradient seam used between major section groups to give the
 * long-scroll page rhythm without introducing heavy assets. Purely decorative.
 */
function SectionSeam() {
  return (
    <div aria-hidden className="relative h-px w-full overflow-visible">
      <div className="absolute inset-x-0 top-0 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute left-1/2 top-0 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/70 to-transparent blur-[1px]" />
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Smooth, springy scroll-progress indicator pinned to the very top.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

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
    <div className="relative min-h-screen bg-background text-foreground antialiased scroll-smooth">
      <SEOHead
        title="UPLY — The Creator Operating System"
        description="Stream, teach, sell, and build community. Keep 95% of everything. The first creator platform on Roku TV."
        canonicalUrl="https://uply.tv/"
        image={LANDING_OG_IMAGE_URL}
        type="website"
        twitterCard="summary_large_image"
        jsonLd={JSON_LD}
      />

      {/* Top scroll-progress bar (blue → purple brand gradient) */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-[#3D7CFF] via-primary to-[#B025FF]"
      />

      {/* Ambient, fixed backdrop for depth and cohesion across the long scroll.
          Lightweight CSS-only gradients — no images, no layout impact. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-1/4 left-1/2 h-[60vw] w-[60vw] max-h-[800px] max-w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute bottom-0 -left-1/4 h-[45vw] w-[45vw] max-h-[600px] max-w-[600px] rounded-full bg-[#B025FF]/[0.07] blur-[140px]" />
        <div className="absolute top-1/3 -right-1/4 h-[45vw] w-[45vw] max-h-[600px] max-w-[600px] rounded-full bg-[#3D7CFF]/[0.06] blur-[140px]" />
        {/* faint grid texture for a premium, engineered feel */}
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <div className="relative z-10">
        <HomepageNav />

        <main>
          <HomepageHero />

          <FeaturedRails />

          <section className="py-10 md:py-14">
            <RosterArtistsRail />
          </section>

          <SectionSeam />
          <HomepageMusicians />
          <HomepageStreamers />
          <HomepageEducators />
          <HomepageLiveCommerce />

          <SectionSeam />
          <HomepageEvents />
          <HomepageTV />
          <HomepageCultural />
          <HomepageB2B />

          <SectionSeam />
          <HomepagePricing />
          <HomepageFinalCTA />
        </main>

        <HomepageFooter />
        <FoundersStickyCTA />
      </div>
    </div>
  );
}
