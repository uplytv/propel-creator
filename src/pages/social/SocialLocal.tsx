import { useState } from "react";
import StoriesRow from "@/components/social/StoriesRow";
import HeydarBanner from "@/components/social/HeydarBanner";
import EventDiscoveryGrid from "@/components/social/EventDiscoveryGrid";
import SocialMarketplace from "@/components/social/SocialMarketplace";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";

const subTabs = ["Active", "New", "Marketplace"] as const;
type SubTab = typeof subTabs[number];

export default function SocialLocal() {
  const [activeTab, setActiveTab] = useState<SubTab>("Active");

  return (
    <>
      <SEOHead title="Local — UPLY" description="Discover what's happening near you" />
      <div className="pb-20">
        {/* Sub-tab bar */}
        <div className="flex items-center gap-1 border-b px-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {subTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative whitespace-nowrap px-3 py-2.5 text-xs font-semibold transition-colors",
                activeTab === tab ? "text-white" : "text-white/40"
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-sm" style={{ backgroundColor: "#00FF85" }} />
              )}
            </button>
          ))}
        </div>

        {activeTab === "Active" && (
          <>
            <HeydarBanner />
            <StoriesRow filterLocal />
            <EventDiscoveryGrid filter="active" />
          </>
        )}
        {activeTab === "New" && <EventDiscoveryGrid filter="new" />}
        {activeTab === "Marketplace" && <SocialMarketplace />}
      </div>
    </>
  );
}
