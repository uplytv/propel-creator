import SectionShell from "./SectionShell";
import FeatureCallout from "./FeatureCallout";

const FEATURES = [
  { emoji: "🎪", label: "Event Pages", desc: "RSVP, ticket links, who's going, live chat before and after." },
  { emoji: "🎟️", label: "Ticket Marketplace", desc: "Fans buy and sell tickets peer-to-peer with your community as the venue." },
  { emoji: "📍", label: "Local Discovery", desc: "Fans find events near them, see which friends are going." },
  { emoji: "🌐", label: "Ticketmaster Integration", desc: "Global event data synced automatically." },
  { emoji: "🎬", label: "Live Stream the Show", desc: "Broadcast your event to fans worldwide who couldn't make it." },
  { emoji: "🌍", label: "Cultural Events", desc: "Persian and diaspora communities — dedicated discovery globally." },
];

export default function HomepageEvents() {
  return (
    <SectionShell id="events" className="bg-background">
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="max-w-3xl mb-10">
          <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
            Concert Promoters & Events
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Your fans are at every show. They're just not connected between them.
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
            You promote a show. 2,000 people buy tickets. Then what? They go home. Until the next show.
            UPLY turns every event into a year-round community.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => <FeatureCallout key={f.label} {...f} />)}
        </div>
      </div>
    </SectionShell>
  );
}
