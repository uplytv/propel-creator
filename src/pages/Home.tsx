import { useEffect } from "react";
import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import Row from "@/components/home/Row";
import LiveTile from "@/components/home/tiles/LiveTile";
import SocialTile from "@/components/home/tiles/SocialTile";
import EventTile from "@/components/home/tiles/EventTile";
import CourseTile from "@/components/home/tiles/CourseTile";
import ShortTile from "@/components/home/tiles/ShortTile";
import UplyLogo from "@/components/shared/UplyLogo";
import {
  liveDemo,
  socialDemo,
  eventsDemo,
  coursesDemo,
  shortsDemo,
} from "@/components/home/demoData";

export default function Home() {
  useEffect(() => {
    document.title = "UPLY — TV + Social + Tickets + Learning, in one app";
    const meta = document.querySelector('meta[name="description"]');
    const desc =
      "Live streams, social posts, tickets and masterclasses from your creators — simulcast to 8 platforms. The creator operating system.";
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />

      <main>
        <Hero />

        {/* Pull rows above the hero fade */}
        <div className="relative z-10 -mt-16 flex flex-col gap-8 pb-20">
          <Row title="Live Now" subtitle="Creators streaming right now — one tap to join">
            {liveDemo.map((d) => <LiveTile key={d.id} data={d} />)}
          </Row>

          <Row title="Your Feed" subtitle="Posts from the creators you follow">
            {socialDemo.map((d) => <SocialTile key={d.id} data={d} />)}
          </Row>

          <Row title="Trending Shorts" subtitle="60-second clips. Auto-made from live streams">
            {shortsDemo.map((d) => <ShortTile key={d.id} data={d} />)}
          </Row>

          <Row title="Upcoming Events" subtitle="Tickets, meetups, and drops from your creators">
            {eventsDemo.map((d) => <EventTile key={d.id} data={d} />)}
          </Row>

          <Row title="Continue Learning" subtitle="Masterclasses from working creators">
            {coursesDemo.map((d) => <CourseTile key={d.id} data={d} />)}
          </Row>
        </div>

        {/* Footer strip */}
        <footer className="border-t border-white/5 pt-10 pb-12 px-6 lg:px-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UplyLogo size={28} showWord />
              <span className="text-white/50 text-sm">The creator operating system.</span>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-[13px]">
              <span className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse motion-reduce:animate-none" />
              <span>
                <span className="font-bold text-white">95% creator payout</span> · 8-platform simulcast · TV + social + tickets + learning
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
