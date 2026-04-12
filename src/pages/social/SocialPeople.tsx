import SEOHead from "@/components/SEOHead";
import HeyedYouSection from "@/components/social/HeyedYouSection";
import SameEventsSection from "@/components/social/SameEventsSection";
import SuggestedPeopleSection from "@/components/social/SuggestedPeopleSection";
import ContactsSyncBanner from "@/components/social/ContactsSyncBanner";

export default function SocialPeople() {
  return (
    <>
      <SEOHead title="People — UPLY" description="Find your people on UPLY" />
      <div className="pb-20">
        <ContactsSyncBanner />
        <HeyedYouSection />
        <SameEventsSection />
        <SuggestedPeopleSection />
      </div>
    </>
  );
}
