import { useState } from "react";
import SEOHead from "@/components/SEOHead";
import ProducerCarousel from "@/components/social/ProducerCarousel";
import ProducerRegistration from "@/components/social/ProducerRegistration";
import EventCreator from "@/components/social/EventCreator";
import EventDiscoveryGrid from "@/components/social/EventDiscoveryGrid";
import VenueSpecialsFeed from "@/components/social/VenueSpecialsFeed";
import RecentlyViewedProducers from "@/components/social/RecentlyViewedProducers";
import AdminTicketmasterSync from "@/components/social/AdminTicketmasterSync";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SocialProducers() {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [showEventCreator, setShowEventCreator] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ["profile-producer", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any).from("profiles").select("is_producer, producer_type").eq("user_id", user.id).single();
      return data as { is_producer: boolean | null; producer_type: string | null } | null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  const isProducer = profileData?.is_producer === true;

  const { data: myEventCount = 0 } = useQuery({
    queryKey: ["my-event-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id);
      return count || 0;
    },
    enabled: !!user && isProducer,
    staleTime: 30_000,
  });

  return (
    <>
      <SEOHead title="Producers — UPLY" description="Discover venues, promoters, and artists" />
      <div className="pb-20">
        {/* Producer registration or dashboard */}
        {user && !isProducer && (
          <div
            className="mx-4 mt-3 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-sm text-white font-semibold mb-1">🎛️ Are you a venue, promoter, or artist?</p>
            <p className="text-xs text-white/40 mb-3">Register as a Producer to create events and post specials</p>
            <button
              onClick={() => setShowRegister(true)}
              className="w-full py-3 rounded-xl font-bold text-sm transition-transform active:scale-95"
              style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
            >
              Become a Producer →
            </button>
          </div>
        )}

        {user && isProducer && (
          <div
            className="mx-4 mt-3 rounded-xl p-4"
            style={{ background: "rgba(61, 124, 255,0.04)", border: "1px solid rgba(61, 124, 255,0.15)" }}
          >
            <p className="text-sm text-white font-bold mb-2">🎛️ Your Producer Dashboard</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/60">{myEventCount} Events</span>
              <span className="text-xs text-white/30">·</span>
              <button
                onClick={() => setShowEventCreator(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95"
                style={{ backgroundColor: "#3D7CFF", color: "#0A0A0A" }}
              >
                + Create Event
              </button>
            </div>
          </div>
        )}

        <AdminTicketmasterSync />

        <RecentlyViewedProducers />

        <ProducerCarousel />

        <div className="px-4 pt-4">
          <h2 className="text-base font-bold text-white mb-3">Upcoming Events</h2>
        </div>
        <EventDiscoveryGrid filter="producer" />

        <div className="px-4 pt-6">
          <h2 className="text-base font-bold text-white mb-3">Happy Hours & Specials</h2>
        </div>
        <VenueSpecialsFeed />
      </div>

      {showRegister && <ProducerRegistration onClose={() => setShowRegister(false)} />}
      {showEventCreator && <EventCreator onClose={() => setShowEventCreator(false)} />}
    </>
  );
}
