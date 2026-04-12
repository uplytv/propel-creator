import StoriesRow from "@/components/social/StoriesRow";
import GoingOutWeekCard from "@/components/social/GoingOutWeekCard";
import EventDiscoveryGrid from "@/components/social/EventDiscoveryGrid";
import SocialFeed from "@/components/social/SocialFeed";
import SEOHead from "@/components/SEOHead";

export default function SocialHome() {
  return (
    <>
      <SEOHead title="Social — UPLY" description="Your social scene on UPLY" />
      <div className="pb-24">
        <StoriesRow />
        <GoingOutWeekCard />
        <EventDiscoveryGrid title="Near you" showSeeAll limit={4} />
        <SocialFeed />
      </div>
    </>
  );
}
