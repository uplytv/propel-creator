import { useState } from "react";
import StoriesRow from "@/components/social/StoriesRow";
import HeydarBanner from "@/components/social/HeydarBanner";
import EventDiscoveryGrid from "@/components/social/EventDiscoveryGrid";
import SocialMarketplace from "@/components/social/SocialMarketplace";
import TrendingEventsWidget from "@/components/social/TrendingEventsWidget";
import LiveEventStreamsSection from "@/components/social/LiveEventStreamsSection";
import SEOHead from "@/components/SEOHead";
import { Search } from "lucide-react";

const subTabs = ["Active", "New", "Marketplace"] as const;
type SubTab = (typeof subTabs)[number];

export default function SocialLocal() {
  const [activeTab, setActiveTab] = useState<SubTab>("Active");

  return (
    <>
      <SEOHead title="Local — UPLY" description="Discover what's happening near you" />
      <div className="pb-24">
        {/* Sub-tab bar */}
        <div
          className="flex items-center px-4 pt-1 pb-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-1 flex-1">
            {subTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative px-4 py-2.5 text-[13px] font-semibold transition-colors rounded-lg"
                  style={{
                    color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                    backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <button
            className="flex items-center justify-center"
            style={{ width: 36, height: 36 }}
          >
            <Search className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        {activeTab === "Active" && (
          <>
            <StoriesRow filterLocal />
            {/* Live at Events Near You */}
            <LiveEventStreamsSection title="Live at Events Near You" />
            <HeydarBanner />
            <TrendingEventsWidget />
            <EventDiscoveryGrid filter="active" title="Local Events" showSeeAll />
          </>
        )}
        {activeTab === "New" && (
          <EventDiscoveryGrid filter="new" title="Recently Added" showSeeAll />
        )}
        {activeTab === "Marketplace" && <SocialMarketplace />}
      </div>
    </>
  );
}
