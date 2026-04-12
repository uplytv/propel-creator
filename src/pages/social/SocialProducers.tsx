import SEOHead from "@/components/SEOHead";
import ProducerCarousel from "@/components/social/ProducerCarousel";
import EventDiscoveryGrid from "@/components/social/EventDiscoveryGrid";
import VenueSpecialsFeed from "@/components/social/VenueSpecialsFeed";

export default function SocialProducers() {
  return (
    <>
      <SEOHead title="Producers — UPLY" description="Discover venues, promoters, and artists" />
      <div className="pb-20">
        <ProducerCarousel />
        <div className="px-4 pt-4">
          <h2 className="text-base font-semibold text-white mb-3">Upcoming Events</h2>
        </div>
        <EventDiscoveryGrid filter="producer" />
        <div className="px-4 pt-6">
          <h2 className="text-base font-semibold text-white mb-3">Happy Hours & Specials</h2>
        </div>
        <VenueSpecialsFeed />
      </div>
    </>
  );
}
