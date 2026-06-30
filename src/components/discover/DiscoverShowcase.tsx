import DiscoverHero from "./DiscoverHero";
import DiscoverStoriesRail from "./DiscoverStoriesRail";
import ContentRail from "./ContentRail";
import EventsRail from "./EventsRail";
import RosterArtistsRail from "./RosterArtistsRail";

/**
 * Netflix-style discovery layer mounted ABOVE the existing Network feed.
 * Purely additive — does not touch existing tabs, grid, or sidebar.
 */
export default function DiscoverShowcase() {
  return (
    <div className="-mx-4 md:-mx-8 mb-6 space-y-5 md:space-y-7">
      <DiscoverHero />
      <DiscoverStoriesRail />
      <RosterArtistsRail />
      <ContentRail source="live" title="🔴 Live Right Now" subtitle="Jump into the action" />
      <ContentRail source="trending" title="🔥 Trending This Week" />
      <EventsRail />
      <ContentRail source="recordings" title="🎬 We Think You'll Love These" />
    </div>
  );
}
