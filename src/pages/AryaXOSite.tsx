import portraitAsset from "@/assets/arya-xo-portrait-v3.jpg.asset.json";
import bandsCoverAsset from "@/assets/150bands-cover.jpg.asset.json";
import getDownCoverAsset from "@/assets/getdown-cover.jpg.asset.json";
import bgAsset from "@/assets/arya-xo-bg.png.asset.json";
import ArtistSiteTemplate from "@/components/artistroster/ArtistSiteTemplate";
import AryaBandsAutoplay from "@/components/AryaBandsAutoplay";
import { buildAryaShareUrl, buildAryaOgImageUrl, currentOgVersion } from "@/lib/aryaShare";
import type { ArtistRosterEntry } from "@/data/artistRoster";

const SHARE_PATH = "/arya-xo-site";

/**
 * Arya XO — full artist website, embedded inside UPLY. Route: /arya-xo-site
 *
 * Thin config wrapper around the shared ArtistSiteTemplate (this page is the
 * design reference the template was built from). Keeps Arya's bespoke bits:
 * the 150 BANDS autoplay chip, versioned share/OG URLs (cache-busting for
 * iMessage/WhatsApp previews), his release covers, and the bespoke blog at
 * /arya-xo/blog. Booking inquiries land in `public_booking_inquiries`.
 */

const OVERRIDES: Partial<ArtistRosterEntry> = {
  displayName: "ARYA XO",
  eyebrow: "", // the hero chip carries the badge line on Arya's site
  portraitUrl: portraitAsset.url,
  heroChip: "150 BANDS — track 2 on HUGEL's album '21'",
  location: "Las Vegas, NV — worldwide",
  bookingEmail: "booking@aryaxo.com",
  bookingTagline:
    "Fill four fields, hit send. No agents, no back-and-forth — your inquiry lands directly in his team's inbox on UPLY and gets a same-week reply.",
  marquee: [
    "150 BANDS — OUT NOW",
    "ARYA XO × HUGEL × NBA YOUNGBOY",
    "NOW BOOKING 2026",
    "LAS VEGAS → WORLDWIDE",
  ],
  bio:
    "Arya XO is a 22-year-old Iranian American rapper, singer and actor, raised between Baltimore and Las Vegas in a family of musicians. He was on stage before most kids hit middle school and built a sound that bridges melodic R&B and pop-leaning club records.\n\n" +
    "At 17 he was opening for Trippie Redd, Lil Yachty and Tory Lanez. At 22 he dropped the track of the summer — “150 BANDS” with HUGEL & NBA YoungBoy — track 2 on HUGEL's new album 21.",
  releases: [
    {
      title: "150 BANDS",
      feat: "HUGEL · NBA YoungBoy — from the album '21'",
      year: "2026",
      tag: "New single",
      href: "https://open.spotify.com/track/3QBkhZL0nUSrm6qcoSEZvt",
      coverUrl: bandsCoverAsset.url,
    },
    {
      title: "Get Down",
      feat: "Arya XO ft. Roy Woods",
      year: "2025",
      tag: "Featured",
      href: "https://open.spotify.com/search/Arya%20XO%20Get%20Down%20Roy%20Woods",
      coverUrl: getDownCoverAsset.url,
    },
  ],
  videos: [{ youtubeId: "Datko9ejIHY", title: "TOO LIT — Official Music Video" }],
  milestones: [
    { age: "17", text: "Opened for Trippie Redd, Lil Yachty & Tory Lanez" },
    { age: "21", text: "Linked with Roy Woods on a breakout collab" },
    { age: "22", text: "150 BANDS with HUGEL & NBA YoungBoy" },
  ],
  stats: [
    { k: "Followers", v: "263K" },
    { k: "Streams", v: "Millions" },
    { k: "Co-signs", v: "HUGEL · NBA YB · Roy Woods" },
    { k: "Based in", v: "Las Vegas, NV" },
  ],
  socials: [
    { kind: "instagram", label: "Instagram", href: "https://www.instagram.com/litreeezy/", handle: "litreeezy" },
    { kind: "youtube", label: "YouTube", href: "https://www.youtube.com/@litreeezy653", handle: "litreeezy653" },
    { kind: "apple_music", label: "Apple Music", href: "https://music.apple.com/us/artist/lit-reeezy/1597315016" },
    { kind: "spotify", label: "Spotify", href: "https://open.spotify.com/search/Arya%20XO" },
  ],
};

export default function AryaXOSite() {
  return (
    <ArtistSiteTemplate
      slug="arya-xo"
      overrides={OVERRIDES}
      heroBgUrl={bgAsset.url}
      buildShareUrl={() => buildAryaShareUrl(SHARE_PATH)}
      ogImage={buildAryaOgImageUrl(currentOgVersion())}
      heroLinks={[
        { label: "Spotify", href: "https://open.spotify.com/track/3QBkhZL0nUSrm6qcoSEZvt", primary: true },
        { label: "Apple Music", href: "https://music.apple.com/us/song/150-bands/6778877438" },
        { label: "YouTube", href: "https://www.youtube.com/watch?v=gqYburgfJ9s" },
      ]}
      heroTagline={
        <>
          22-year-old Iranian American rapper, singer &amp; actor from Las Vegas. Dropped the track of
          the summer —{" "}
          <span className="text-[var(--arya-text)] font-semibold">
            HUGEL × NBA YoungBoy &mdash; &ldquo;150 BANDS&rdquo;
          </span>
          , the second cut on HUGEL&apos;s new album <span className="italic">21</span>.
        </>
      }
      featured={{
        href: "/arya-xo/blog",
        kicker: "Feature · Summer 2026 · 8 min read",
        title: "Twenty-two, and writing his own lane.",
        excerpt:
          "The full story behind “150 Bands” — the Afro House, Latin House and Hip-Hop crossover with HUGEL and NBA YoungBoy that put Arya XO on the front of dance music's biggest album of the year.",
        tags: ["Afro House", "Latin House", "Hip-Hop"],
        imageUrl: portraitAsset.url,
      }}
    >
      <AryaBandsAutoplay />
    </ArtistSiteTemplate>
  );
}
