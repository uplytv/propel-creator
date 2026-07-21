/**
 * Artist Roster — single source of truth for hand-curated artist pages
 * that don't (yet) live in the DB. Add an entry here and the artist
 * automatically gets:
 *   • A link-in-bio hub at /:slug          (e.g. /omid)
 *   • A full editorial site at /:slug-site (e.g. /omid-site)
 *   • A blog feed at /:slug/blog (+ /:slug/blog/:postSlug)
 *   • A community page at /:slug/community
 *   • A courses page at /:slug/courses (+ /:slug/courses/:courseSlug)
 *   • Curated search results on UPLY
 *   • A card on the public Roster hub at /roster
 *
 * Routes are registered in App.tsx via ARTIST_ROSTER (loop).
 * Curated search is wired in src/lib/curatedSearch.ts.
 */

export type SocialKind =
  | "instagram"
  | "youtube"
  | "spotify"
  | "apple_music"
  | "soundcloud"
  | "tiktok"
  | "facebook"
  | "threads"
  | "website"
  | "email";

export interface ArtistSocial {
  kind: SocialKind;
  label: string;
  sub?: string;
  href: string;
  handle?: string;
}

export interface ArtistVideo {
  youtubeId?: string;
  instagramUrl?: string;
  title: string;
  caption?: string;
}

export interface ArtistBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  publishedAt: string; // ISO date
  /** Plain-text body, \n\n separates paragraphs */
  body: string;
  tag?: string;
  /** Optional editorial cover image shown on blog cards and article headers. */
  coverUrl?: string;
}

export interface ArtistGalleryItem {
  url: string;
  alt: string;
  caption?: string;
}

export interface ArtistCommunity {
  name: string;
  description: string;
  membersLabel: string;
  perks: string[];
  /** Monthly USD; 0 = free */
  priceUsd: number;
  /** Premium positioning: hide the price — pricing by application via the booking form. */
  contactForPricing?: boolean;
}

export interface ArtistCourse {
  slug: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "All Levels";
  lessons: number;
  duration: string;
  priceUsd: number;
  /** Premium positioning: hide the price — pricing by application via the booking form. */
  contactForPricing?: boolean;
  summary: string;
  outline: string[];
  /** Optional editorial cover image (CDN url from .asset.json) */
  coverUrl?: string;
}

export interface ArtistRelease {
  title: string;
  feat?: string;
  year: string | number;
  tag?: string;
  /** Square cover art URL (CDN or absolute). */
  coverUrl?: string;
  href?: string;
}

export interface ArtistMilestone {
  age?: string | number;
  year?: string | number;
  text: string;
}

export interface ArtistStat {
  k: string;
  v: string;
}

export interface ArtistRosterEntry {
  slug: string;
  aliases?: string[];
  displayName: string;
  eyebrow: string;
  tagline: string;
  bio: string;
  gradient: { from: string; to: string };
  accent: string;
  portraitUrl?: string;
  socials: ArtistSocial[];
  videos?: ArtistVideo[];
  spotifyArtistEmbedId?: string;
  /** Optional list of Spotify track IDs to render as compact preview players. */
  spotifyTrackEmbeds?: { id: string; title: string }[];
  searchKeywords: string[];
  verified?: boolean;
  /** Primary creator type shown as a small badge on roster cards and used for type filtering (e.g. "Singer", "DJ"). */
  creatorType?: string;
  /** ISO date (YYYY-MM-DD) the artist's profile was established on UPLY — rendered as "Est. <Mon YYYY>" on roster cards. */
  joinedAt?: string;
  bookingEmail?: string;
  location?: string;
  /** Optional pitch line shown in the booking section. */
  bookingTagline?: string;
  /** Optional hero chip text (e.g. "New release — out now"). */
  heroChip?: string;
  /** Optional rotating marquee lines under the hero. */
  marquee?: string[];
  /** Optional discography for the editorial site. */
  releases?: ArtistRelease[];
  /** Optional milestones for the about timeline. */
  milestones?: ArtistMilestone[];
  /** Optional key/value stat cards. */
  stats?: ArtistStat[];
  /** Optional image gallery for the editorial site. */
  gallery?: ArtistGalleryItem[];
  /** Blog posts surfaced at /:slug/blog */
  posts?: ArtistBlogPost[];
  /** Slug of a blog post to feature on the editorial site. */
  featuredPostSlug?: string;
  /** Community offering surfaced at /:slug/community */
  community?: ArtistCommunity;
  /** Courses offered at /:slug/courses */
  courses?: ArtistCourse[];
  /** Slug of an active UPLY competition surfaced at /:slug/competition */
  competitionSlug?: string;
  /** Override the section chips shown on the /roster hub card (defaults derive from posts/community/courses). */
  sectionsOverride?: string[];
  /**
   * Compliance / responsible-use lines rendered footer-level on the shared
   * roster surfaces (site, blog, community, courses). Required for regulated
   * niches — e.g. trading ("not financial advice") and sports betting
   * ("21+ · bet responsibly"). Omit for artists that don't need them.
   */
  disclaimers?: string[];
}



export const ARTIST_ROSTER: ArtistRosterEntry[] = [
  // ============================================================
  // OMID — Persian legend (managed by UPLY)
  // ============================================================
  {
    slug: "omid",
    aliases: ["omid-music", "omidmusic"],
    displayName: "OMID",
    eyebrow: "Persian Legend · Managed by UPLY",
    tagline: "Four decades of Persian pop. One unmistakable voice.",
    bio:
      "OMID is one of the most beloved voices in modern Persian music — a generation-defining pop vocalist whose catalogue spans romantic ballads, Nowruz anthems, and arena-filling tours across the diaspora.\n\n" +
      "From his early career in Tehran to sold-out runs in Los Angeles, Stockholm, and beyond, OMID has built a body of work that bridges classic Iranian songcraft with contemporary production.\n\n" +
      "Booking, sync, and press inquiries are handled directly through UPLY.",
    gradient: { from: "#1a0b2e", to: "#0a0a0a" },
    accent: "#C9A84C",
    portraitUrl: "/__l5e/assets-v1/8f28c5fe-38f5-41e3-b5b4-20b38e64c0d8/omid-portrait.jpg",
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@omid_music · 1.4M followers", href: "https://www.instagram.com/omid_music", handle: "omid_music" },
      { kind: "youtube", label: "YouTube", sub: "Official channel · music videos & tours", href: "https://www.youtube.com/results?search_query=omid+music+official" },
      { kind: "spotify", label: "Spotify", sub: "Stream the full catalogue", href: "https://open.spotify.com/search/Omid" },
      { kind: "apple_music", label: "Apple Music", sub: "Listen on Apple Music", href: "https://music.apple.com/us/search?term=Omid+Persian" },
    ],
    videos: [
      { title: "Latest from @omid_music", instagramUrl: "https://www.instagram.com/omid_music/" },
    ],
    searchKeywords: ["omid", "omid music", "omid_music", "persian legend", "persian pop", "iranian singer", "omid jamshid", "nowruz"],
    verified: true,
    creatorType: "Singer",
    joinedAt: "2026-02-01",
    bookingEmail: "bookings@uply.tv",
    location: "Los Angeles · Stockholm · Tehran",
    heroChip: "Now booking 2026 — Nowruz & summer dates",
    bookingTagline: "Four decades of stage-tested Persian pop. Fill four fields and OMID's team replies the same week.",
    marquee: ["NOWRUZ 2026 — TICKETS LIVE", "OMID · MANAGED BY UPLY", "LA · STOCKHOLM · TEHRAN", "BOOK DIRECT — NO AGENTS"],
    releases: [
      { title: "Bezar Beram", feat: "Single", year: 2024, tag: "Single", href: "https://open.spotify.com/search/Omid%20Bezar%20Beram" },
      { title: "Khaterat", feat: "Album", year: 2022, tag: "Album", href: "https://open.spotify.com/search/Omid%20Khaterat" },
    ],
    milestones: [
      { year: "1986", text: "First studio session in Tehran." },
      { year: "1994", text: "Breakout LA residency — Persian diaspora goes global." },
      { year: "2009", text: "Sold-out European arena run." },
      { year: "2026", text: "Nowruz World Tour announced via UPLY." },
    ],
    stats: [
      { k: "Followers", v: "1.4M" },
      { k: "Catalogue", v: "40+ years" },
      { k: "Based in", v: "LA · Stockholm · Tehran" },
      { k: "Booking", v: "Direct via UPLY" },
    ],
    featuredPostSlug: "four-decades-on-stage",

    posts: [
      {
        slug: "four-decades-on-stage",
        title: "Four decades on stage, one voice carrying a culture",
        excerpt: "How OMID built a catalogue that became the soundtrack of the Persian diaspora.",
        readTime: "6 min read",
        publishedAt: "2026-05-12",
        tag: "Feature",
        body:
          "There are voices in Persian pop that come and go. And then there is OMID — a vocalist whose four-decade run has bent with every shift in the diaspora's mood, from the soft-lit ballads of the 90s to the bigger, brighter production of the streaming era.\n\n" +
          "Ask any Iranian wedding DJ from Los Angeles to Stockholm which artist is guaranteed to fill the dance floor twice in one night, and OMID's name comes up. Not because of nostalgia alone — because the songs still work. They were built to.\n\n" +
          "On UPLY, OMID's catalogue, tours, and bookings now live under one roof. That's the point of this platform: a legacy artist with a working machine around him, not a museum.",
      },
      {
        slug: "nowruz-tour-2026",
        title: "Inside the 2026 Nowruz tour",
        excerpt: "Behind the scenes of OMID's spring run across LA, Toronto, London, and Dubai.",
        readTime: "4 min read",
        publishedAt: "2026-03-20",
        tag: "Tour",
        body:
          "Spring on the Persian calendar is OMID season. The 2026 Nowruz tour hit four cities in three weeks — Los Angeles, Toronto, London, Dubai — and sold through tier one on every stop.\n\n" +
          "The band ran a stripped-back trio configuration for the first half of each show before opening up into the full 9-piece for the encore block. The result was an arc that felt like a Nowruz dinner: quiet conversation first, then the music gets louder, then everyone is dancing.",
      },
    ],
    community: {
      name: "OMID Inner Circle",
      description: "Early-access tour announcements, presale codes, signed merch drops, and unreleased acoustic takes — direct from OMID and the team.",
      membersLabel: "12,400 members",
      perks: [
        "48-hour presale window on every tour date",
        "Members-only acoustic & studio takes",
        "Signed-merch drops before public release",
        "Quarterly live Q&A with OMID",
      ],
      priceUsd: 9,
    },
    courses: [
      {
        slug: "omid-foundation",
        title: "The Omid Foundation",
        level: "All Levels",
        lessons: 0,
        duration: "Ongoing",
        priceUsd: 0,
        summary:
          "The Omid Foundation is OMID's non-profit dedicated to empowering young Iranian women and preserving Persian arts and culture. 100% of contributions go directly to programming, scholarships, and community outreach.",
        outline: [
          "Scholarships for young Iranian women",
          "Music & arts education programs",
          "Cultural preservation initiatives",
          "Community outreach across the diaspora",
          "Annual benefit concerts & fundraisers",
        ],
      },
    ],
    competitionSlug: "omid-global-talent-search",
  },

  // ============================================================
  // MORVARID SHAHBAZI — Pearl of Persia
  // ============================================================
  {
    slug: "morvarid",
    aliases: ["morvarid-shahbazi", "morvaridshahbazi"],
    displayName: "Morvarid Shahbazi",
    eyebrow: "Pearl of Persia · Singer · Dancer · Instructor",
    tagline: "Singer. Dancer. Instructor. Performing since age 5.",
    bio:
      "Morvarid Shahbazi — known to her audience as the Pearl of Persia — is a Los Angeles-based singer, dancer, and performance instructor with deep roots in the Persian music tradition.\n\n" +
      "A lifelong performer who began singing at five, Morvarid blends classical Iranian vocals with modern stagecraft. She has shared stages with Aref and other titans of Persian music, and continues to release new music, teach, and tour.\n\n" +
      "Reach out via Instagram DM or email for performance bookings, lessons, and collaborations.",
    gradient: { from: "#2b0a1e", to: "#0a0a0a" },
    accent: "#E94A8C",
    portraitUrl: "/__l5e/assets-v1/391ad103-77fd-4435-a1d4-5330429ed4b2/morvarid-portrait.jpg",
    spotifyArtistEmbedId: "5QFbUVTpgjwACp2852n50U",
    spotifyTrackEmbeds: [
      { id: "6AUq0zMYPN85UmixhzAWkE", title: "Ghalbe Man" },
      { id: "6miZr1kBewKXLqrdduprf6", title: "Morvaridam" },
      { id: "4tgF1IVRRFfGyvjQpaPOE5", title: "Vaghti Azam Doori" },
      { id: "2qhD0L4ckt00vu06WR8RiI", title: "Mahboub" },
    ],
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@morvaridshahbazi · 59K followers", href: "https://www.instagram.com/morvaridshahbazi", handle: "morvaridshahbazi" },
      { kind: "spotify", label: "Spotify", sub: "Listen on Spotify", href: "https://open.spotify.com/artist/5QFbUVTpgjwACp2852n50U" },
      { kind: "youtube", label: "YouTube", sub: "Performances & music videos", href: "https://www.youtube.com/results?search_query=morvarid+shahbazi" },
      { kind: "threads", label: "Threads", sub: "@morvaridshahbazi", href: "https://www.threads.net/@morvaridshahbazi" },
      { kind: "facebook", label: "Facebook", sub: "Morvarid Shahbazi", href: "https://www.facebook.com/morvaridshahbazi" },
    ],
    videos: [
      { title: "Latest reels", instagramUrl: "https://www.instagram.com/morvaridshahbazi/" },
    ],
    searchKeywords: ["morvarid", "morvaird", "morvard", "morwarid", "morvarid shahbazi", "morvaridshahbazi", "pearl of persia", "persian dancer", "persian singer", "morvarid production"],
    verified: false,
    creatorType: "Singer",
    joinedAt: "2026-05-01",
    location: "Los Angeles",
    heroChip: "Now booking weddings, concerts & private events",
    bookingTagline: "Live vocals, choreography, and stagecraft from a performer who's been on stage since age five.",
    marquee: ["PEARL OF PERSIA", "SINGER · DANCER · INSTRUCTOR", "BOOK PRIVATE LESSONS", "MANAGED BY UPLY"],
    releases: [
      { title: "Pearl", feat: "Single", year: 2025, tag: "New", href: "https://open.spotify.com/artist/5QFbUVTpgjwACp" },
      { title: "Live with Aref", feat: "Concert highlight", year: 2024, tag: "Live", href: "https://www.youtube.com/results?search_query=morvarid+shahbazi+aref" },
    ],
    milestones: [
      { age: 5, text: "First public performance." },
      { age: 14, text: "Booked first paid concert in LA." },
      { age: 20, text: "Shared the stage with Aref." },
      { age: 25, text: "Launched private vocal & dance studio." },
    ],
    stats: [
      { k: "Followers", v: "59K" },
      { k: "Disciplines", v: "Vocal · Dance · Teaching" },
      { k: "Based in", v: "Los Angeles" },
      { k: "Lessons", v: "Private & group" },
    ],
    featuredPostSlug: "pearl-of-persia",

    posts: [
      {
        slug: "pearl-of-persia",
        title: "Becoming the Pearl of Persia",
        excerpt: "Morvarid on a lifetime in performance — from age-five recitals to LA stages with Aref.",
        readTime: "5 min read",
        publishedAt: "2026-06-01",
        tag: "Feature",
        body:
          "Morvarid Shahbazi was five years old the first time she sang for an audience. The audience was her family. The reaction told her everything: this was the thing.\n\n" +
          "Two decades later, the Pearl of Persia has built a career that refuses to sit in one lane. She sings. She dances. She teaches. And she has shared stages with Aref — a moment she still describes as 'a passing of the torch I didn't ask for, but I'll carry.'\n\n" +
          "On UPLY, Morvarid runs her booking inquiries, lessons, and community directly. No intermediaries. Just the artist and the people who show up for her.",
      },
    ],
    community: {
      name: "Pearl Circle",
      description: "Members-only dance & vocal drills, monthly live classes, and behind-the-scenes from rehearsals and shoots.",
      membersLabel: "1,820 members",
      perks: [
        "Monthly live group class (vocal or dance)",
        "Members-only choreography breakdowns",
        "First access to private lesson slots",
        "Backstage clips from every shoot",
      ],
      priceUsd: 19,
    },
    courses: [
      {
        slug: "persian-dance-foundations",
        title: "Persian Dance Foundations",
        level: "Beginner",
        lessons: 10,
        duration: "2h 50m",
        priceUsd: 49,
        summary: "The shoulder, hand, and footwork vocabulary that makes Persian dance unmistakable — taught at performance pace.",
        outline: [
          "Posture & frame",
          "Hand articulation (the signature)",
          "Shoulder isolation drills",
          "Building a 16-count routine",
          "Performing to live music vs. tracks",
        ],
      },
      {
        slug: "stagecraft-for-singers",
        title: "Stagecraft for Singers",
        level: "Intermediate",
        lessons: 8,
        duration: "2h 10m",
        priceUsd: 59,
        summary: "How to own the stage — eye contact, mic technique, transitions, and connecting with a Persian crowd.",
        outline: [
          "Reading the room",
          "Mic technique close & far",
          "Moving without losing breath",
          "Transitioning between songs",
        ],
      },
    ],
  },

  // ============================================================
  // ANDY — Iranian-American pop icon
  // ============================================================
  {
    slug: "andy",
    aliases: ["andy-music", "andymusic1"],
    displayName: "ANDY",
    eyebrow: "Iranian-American Pop Icon",
    tagline: "The voice that defined a generation of Persian pop.",
    bio:
      "ANDY (Andranik Madadian) is one of the most influential Iranian-American pop artists of the modern era. From his early years as half of the duo Andy & Kouros to his solo run of platinum-tier hits, ANDY has been a fixture of Persian pop for more than three decades.\n\n" +
      "A Grammy-recognized collaborator (with Jon Bon Jovi on the historic \"Stand By Me\" remake for the 2009 Nowruz address), ANDY's catalogue spans romantic ballads, dance-floor anthems, and devotional tracks performed in venues from Los Angeles to Dubai.\n\n" +
      "Booking and press inquiries handled through UPLY.",
    gradient: { from: "#0a1f3a", to: "#0a0a0a" },
    accent: "#3D7CFF",
    portraitUrl: "/__l5e/assets-v1/c64e7b0a-6bc3-4486-b916-54fb63b38c8e/andy-portrait.jpg",
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@andymusic1 · Official", href: "https://www.instagram.com/andymusic1", handle: "andymusic1" },
      { kind: "youtube", label: "YouTube", sub: "Official channel", href: "https://www.youtube.com/results?search_query=andy+music+persian" },
      { kind: "spotify", label: "Spotify", sub: "Stream the catalogue", href: "https://open.spotify.com/search/Andy%20Madadian" },
      { kind: "apple_music", label: "Apple Music", sub: "Listen on Apple Music", href: "https://music.apple.com/us/search?term=Andy+Madadian" },
    ],
    videos: [
      { title: "Latest from @andymusic1", instagramUrl: "https://www.instagram.com/andymusic1/" },
    ],
    searchKeywords: ["andy", "andy music", "andymusic1", "andy madadian", "andranik madadian", "persian pop", "iranian pop", "andy & kouros"],
    verified: true,
    creatorType: "Singer",
    joinedAt: "2026-02-01",
    bookingEmail: "bookings@uply.tv",
    location: "Los Angeles",
    heroChip: "Booking 2026 — international dates open",
    bookingTagline: "Three decades of arena-tested Persian pop. Direct booking through ANDY's UPLY team — no middlemen.",
    marquee: ["ANDY · IRANIAN-AMERICAN POP ICON", "BOOK 2026 DATES", "STAND BY ME — WITH BON JOVI", "MANAGED BY UPLY"],
    releases: [
      { title: "Stand By Me", feat: "with Jon Bon Jovi", year: 2009, tag: "Historic", href: "https://www.youtube.com/results?search_query=andy+bon+jovi+stand+by+me" },
      { title: "Best of ANDY", feat: "Compilation", year: 2023, tag: "Catalogue", href: "https://open.spotify.com/search/Andy%20Madadian" },
    ],
    milestones: [
      { year: "1989", text: "Debut as half of Andy & Kouros." },
      { year: "1995", text: "First platinum-selling solo album." },
      { year: "2009", text: "Grammy-recognized 'Stand By Me' with Bon Jovi." },
      { year: "2026", text: "International tour announced via UPLY." },
    ],
    stats: [
      { k: "Followers", v: "Millions" },
      { k: "Catalogue", v: "30+ years" },
      { k: "Based in", v: "Los Angeles" },
      { k: "Booking", v: "Direct via UPLY" },
    ],
    featuredPostSlug: "stand-by-me",

    posts: [
      {
        slug: "stand-by-me",
        title: "How 'Stand By Me' with Bon Jovi happened",
        excerpt: "ANDY on the 2009 Nowruz address, the studio call, and what the moment meant.",
        readTime: "7 min read",
        publishedAt: "2026-04-08",
        tag: "Story",
        body:
          "The phone call came from a producer ANDY had worked with twice. The pitch was short: would he be open to recording 'Stand By Me' with Jon Bon Jovi, in Farsi and English, for the President's Nowruz address.\n\n" +
          "He said yes before he hung up.\n\n" +
          "The session itself was fast — two days, one room, no theatrics. What lingered was the response: messages from Iranian families on three continents saying they had cried at the kitchen table watching it back. That, ANDY says, is the only metric that ever mattered.",
      },
      {
        slug: "30-years-in-persian-pop",
        title: "Thirty years in Persian pop — what changed, what didn't",
        excerpt: "From Andy & Kouros cassettes in LA to streaming charts — a look back.",
        readTime: "5 min read",
        publishedAt: "2026-02-14",
        tag: "Reflection",
        body:
          "When Andy & Kouros started, the distribution model was a cassette in a Westwood music shop. Today the same songs auto-play in a 17-year-old's car in Tehran via a streaming service.\n\n" +
          "The medium changed. The songs, mostly, didn't. ANDY's take: 'A good melody doesn't care what year it is.'",
      },
    ],
    community: {
      name: "ANDY Official Club",
      description: "The official home for ANDY's longtime fans — presales, exclusive video, and direct messages from the artist on every release.",
      membersLabel: "24,600 members",
      perks: [
        "Presale access on every show",
        "Members-only music videos & rehearsals",
        "Birthday & Nowruz greetings from ANDY",
        "Annual members-only livestream",
      ],
      priceUsd: 12,
    },
    courses: [
      {
        slug: "persian-pop-performance",
        title: "Persian Pop Performance: Stage, Voice & Story",
        level: "All Levels",
        lessons: 6,
        duration: "2h 15m",
        priceUsd: 89,
        coverUrl: "/__l5e/assets-v1/df60404d-be68-4a61-acef-aa5eaf0d42f9/andy-course-cover.jpg",
        summary:
          "ANDY shares four decades of stagecraft — how to find your voice, command a room, and turn a Persian pop song into a moment audiences carry home.",
        outline: [
          "Lesson 1 — Finding your voice: tone, range, and the songs that suit you",
          "Lesson 2 — Phrasing Farsi lyrics with feeling, not just accuracy",
          "Lesson 3 — Stage presence: posture, eye contact, and owning the silence",
          "Lesson 4 — Building a setlist that takes an audience on a journey",
          "Lesson 5 — Working with a live band vs. tracks — rehearsal essentials",
          "Lesson 6 — Connecting across generations: honoring tradition while staying current",
        ],
      },
    ],
  },

  // ============================================================
  // ARYA XO — Bay Area rapper / artist (bespoke pages)
  // ============================================================
  {
    slug: "arya-xo",
    aliases: ["arya", "aryaxo", "arya-xo-links"],
    displayName: "Arya XO",
    eyebrow: "Bay Area Artist · Managed by UPLY",
    tagline: "150 Bands. Get Down. A new wave of West Coast rap.",
    bio:
      "Arya XO is a Bay Area rapper and recording artist building a catalogue of high-energy, melodic West Coast rap — anchored by breakout records '150 Bands' and 'Get Down'.\n\n" +
      "His full experience on UPLY — site, links, and blog — lives at /arya-xo.",
    gradient: { from: "#1a0b2e", to: "#0a0a0a" },
    // Arya's signature electric green — matches his bespoke site brand.
    accent: "#00FF85",
    portraitUrl: "/__l5e/assets-v1/ecb368e0-99ff-410b-bc3f-f36978159574/arya-xo-portrait-v3.jpg",
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@aryaxo", href: "https://www.instagram.com/aryaxo", handle: "aryaxo" },
      { kind: "spotify", label: "Spotify", sub: "Stream the catalogue", href: "https://open.spotify.com/search/Arya%20XO" },
      { kind: "youtube", label: "YouTube", sub: "Official videos", href: "https://www.youtube.com/results?search_query=arya+xo" },
    ],
    searchKeywords: ["arya", "arya xo", "aryaxo", "150 bands", "get down", "bay area rap"],
    verified: true,
    creatorType: "Rapper",
    joinedAt: "2025-12-01",
    bookingEmail: "bookings@uply.tv",
    location: "Bay Area, CA",
    sectionsOverride: ["Links", "Site", "Blog"],
  },

  // ============================================================
  // BAZI — DJ / producer (Ari Shahbazi)
  // ============================================================
  {
    slug: "bazi",
    aliases: ["dj-bazi", "djbazi", "arishahbazi", "ari-shahbazi", "arianshahbazi"],
    displayName: "BAZI",
    eyebrow: "DJ · Producer · Open-Format",
    tagline: "Open-format sets that move every room — house, hip-hop, Persian, and everything in between.",
    bio:
      "BAZI is the DJ alias of Ari Shahbazi — an open-format selector building a reputation for high-energy sets that bridge house, hip-hop, Afro, and Persian dance music in a single seamless arc.\n\n" +
      "From private events to packed club nights, BAZI reads the room first and the genre second. The result is a set that doesn't sit in one lane — it just keeps the floor moving.\n\n" +
      "Bookings, collabs, and press are handled directly here on UPLY.",
    gradient: { from: "#001a3a", to: "#000814" },
    accent: "#1FA8FF",
    portraitUrl: "/__l5e/assets-v1/a78ddb7f-94f5-42a8-967f-fb902218775f/bazi-portrait.jpg",
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@arishahbazi · behind the decks", href: "https://www.instagram.com/arishahbazi", handle: "arishahbazi" },
      { kind: "tiktok", label: "TikTok", sub: "@arianshahbazi · live sets & edits", href: "https://www.tiktok.com/@arianshahbazi", handle: "arianshahbazi" },
      { kind: "youtube", label: "YouTube", sub: "@arishah · full sets & mixes", href: "https://www.youtube.com/@arishah" },
      { kind: "soundcloud", label: "SoundCloud", sub: "Stream the latest mixes", href: "https://soundcloud.com/search?q=bazi%20dj" },
      { kind: "spotify", label: "Spotify", sub: "Curated open-format playlists", href: "https://open.spotify.com/search/Bazi%20DJ" },
      { kind: "website", label: "X / Twitter", sub: "@arishahbazi", href: "https://x.com/arishahbazi" },
      { kind: "email", label: "Bookings", sub: "bookings@uply.tv", href: "mailto:bookings@uply.tv" },
    ],
    videos: [
      { title: "Latest behind the decks", instagramUrl: "https://www.instagram.com/arishahbazi/" },
    ],
    searchKeywords: ["bazi", "dj bazi", "djbazi", "ari shahbazi", "arishahbazi", "arian shahbazi", "open format dj", "persian dj", "house dj", "hip hop dj"],
    verified: true,
    creatorType: "DJ",
    joinedAt: "2026-04-01",
    bookingEmail: "bookings@uply.tv",
    location: "Los Angeles · Worldwide",
    heroChip: "Now booking 2026 — clubs, weddings & private events",
    bookingTagline: "Open-format sets engineered for the room you actually have. Reply within 24 hours, every inquiry.",
    marquee: ["BAZI · OPEN-FORMAT DJ", "BOOK 2026 NOW", "HOUSE · HIP-HOP · PERSIAN", "MANAGED ON UPLY"],
    releases: [
      { title: "Night One — Live Mix", feat: "60 min open-format", year: 2026, tag: "Mix", href: "https://soundcloud.com/search?q=bazi" },
      { title: "Persian House Edits Vol. 1", feat: "Edit pack", year: 2025, tag: "Edits", href: "https://soundcloud.com/search?q=bazi%20persian%20house" },
      { title: "After Hours", feat: "Single", year: 2025, tag: "Original", href: "https://open.spotify.com/search/Bazi%20After%20Hours" },
    ],
    milestones: [
      { year: "2019", text: "First residency — Friday nights, Los Angeles." },
      { year: "2022", text: "Opened for headline international acts on the West Coast circuit." },
      { year: "2024", text: "Launched BAZI as a dedicated open-format brand." },
      { year: "2026", text: "Global booking calendar live on UPLY." },
    ],
    stats: [
      { k: "Sets / yr", v: "120+" },
      { k: "Format", v: "Open · seamless" },
      { k: "Based in", v: "Los Angeles" },
      { k: "Booking", v: "Direct via UPLY" },
    ],
    featuredPostSlug: "open-format-philosophy",
    posts: [
      {
        slug: "open-format-philosophy",
        title: "Open-format isn't a genre — it's a job description",
        excerpt: "Why BAZI refuses to pick a lane, and how reading the room beats sticking to a playlist every single night.",
        readTime: "5 min read",
        publishedAt: "2026-06-18",
        tag: "Craft",
        body:
          "Every DJ gets asked the same question early in their career: what's your sound? It's a fair question. It's also, for an open-format selector, the wrong one.\n\n" +
          "My job is not to play the music I like for an hour. My job is to take a room of strangers and turn them into a single moving thing for as long as I'm behind the decks. Some nights that means house from minute one. Some nights it means starting with hip-hop, pulling into Afro by midnight, and finishing on Persian dance records because the room demanded it.\n\n" +
          "The skill isn't in knowing one genre cold. It's in knowing twenty of them well enough to bridge between any two without losing the floor. That's the discipline. That's the brand.",
      },
      {
        slug: "how-i-build-a-set",
        title: "How I build a set from the door count up",
        excerpt: "The 90-minute prep ritual — door count, demographic guess, opener's last record — before I ever touch a USB.",
        readTime: "4 min read",
        publishedAt: "2026-05-22",
        tag: "Behind the decks",
        body:
          "Before I plug in a USB, I want to know three things: how many people are in the room, who they are, and what the opener just played.\n\n" +
          "Door count tells me energy ceiling. Demographic tells me language and tempo. Opener's last record tells me where to land my first one — never more than ±4 BPM, never a hard left into a new genre.\n\n" +
          "From there it's all instinct. But the first ten minutes are math, and the math is what stops a good booking from going sideways.",
      },
      {
        slug: "persian-records-on-a-mainstream-floor",
        title: "Dropping Persian records on a mainstream floor — when and why",
        excerpt: "There's a right and wrong moment to drop a Persian record in front of a non-Persian crowd. Here's the read.",
        readTime: "6 min read",
        publishedAt: "2026-04-04",
        tag: "Culture",
        body:
          "Persian dance records have something most pop music doesn't — a tempo and percussion that translates instantly even to a crowd that has never heard a word of Farsi.\n\n" +
          "The trick is the entry. I never lead with a Persian record cold. I bridge in through Afro-house or a percussion-led edit, let the rhythm carry the unfamiliarity, and then let the vocal land once the floor is committed.\n\n" +
          "Done right, a mixed crowd doesn't notice the language change — they notice the energy change. That's the goal.",
      },
    ],
    community: {
      name: "BAZI Inner Circle",
      description: "Monthly exclusive mixes, edit packs, gear notes, and presale access to every show — direct from BAZI.",
      membersLabel: "Just launched",
      perks: [
        "Monthly members-only 60-min mix",
        "Edit packs & cue notes from real sets",
        "Presale access to every booking",
        "Quarterly live Q&A on tech, gear & touring",
      ],
      priceUsd: 9,
    },
    courses: [
      {
        slug: "open-format-foundations",
        title: "Open-Format DJing: Foundations",
        level: "Beginner",
        lessons: 8,
        duration: "2h 30m",
        priceUsd: 49,
        summary: "The exact mental model BAZI uses to bridge genres without losing the floor — from BPM math to crowd reading.",
        outline: [
          "What open-format actually means",
          "BPM ranges and safe transition windows",
          "Building a 4-genre bridge in under 8 bars",
          "Reading the room in the first 10 minutes",
          "The 3 records every open-format DJ needs ready",
          "Recovering from a dropped floor",
          "Set arcs for clubs vs. weddings vs. private events",
          "Recording and reviewing your own sets",
        ],
      },
      {
        slug: "persian-edits-masterclass",
        title: "Persian Edits Masterclass",
        level: "Intermediate",
        lessons: 6,
        duration: "1h 50m",
        priceUsd: 69,
        summary: "How to build club-ready edits of Persian dance records that work on mainstream floors — from stem prep to drop placement.",
        outline: [
          "Stem isolation on legacy Persian recordings",
          "Re-quantizing live percussion to a club grid",
          "Choosing the right vocal hook",
          "Building a 32-bar intro DJs will actually mix into",
          "Mastering edits for club playback",
          "Distribution & rights basics",
        ],
      },
    ],
  },

  // ============================================================
  // BOBBY — Business with Bob (AI-first creator economy operator)
  // ============================================================
  {
    slug: "bobby",
    aliases: ["bob", "business-with-bob", "businesswithbob", "business_with_bob"],
    displayName: "Bobby",
    eyebrow: "Creator · AI Operator · Business with Bob",
    tagline: "I went all-in on AI and rebuilt my entire creator business on UPLY. Here's the playbook.",
    bio:
      "Bobby is the founder of Business with Bob — a creator-led brand teaching operators, founders, and solo creators how to actually use AI to ship faster, sell more, and own their audience.\n\n" +
      "After a year of testing every creator platform on the market — Whop, Skool, Kajabi, you name it — Bobby went all-in on UPLY. Why? Because the features other platforms charge separately for (community, courses, link-in-bio, live, payments, analytics) all live in one place, with a 95% creator payout.\n\n" +
      "If you want to follow the build, the course, and the daily ops — this is the front door.",
    gradient: { from: "#0a0f2e", to: "#000000" },
    accent: "#FF6B35",
    portraitUrl: "/__l5e/assets-v1/0c67f107-d46a-4123-a29c-9894e3658991/bobby-portrait.jpg",
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@business_with_bob · daily AI + business plays", href: "https://www.instagram.com/business_with_bob", handle: "business_with_bob" },
      { kind: "tiktok", label: "TikTok", sub: "@businesswithbob · 60-sec breakdowns", href: "https://www.tiktok.com/@businesswithbob", handle: "businesswithbob" },
      { kind: "youtube", label: "YouTube", sub: "Long-form: AI workflows & creator economics", href: "https://www.youtube.com/results?search_query=business+with+bob" },
      { kind: "website", label: "X / Twitter", sub: "@businesswithbob", href: "https://x.com/businesswithbob" },
      { kind: "email", label: "Work with Bobby", sub: "hello@uply.tv", href: "mailto:hello@uply.tv" },
    ],
    videos: [
      { title: "Latest from @business_with_bob", instagramUrl: "https://www.instagram.com/business_with_bob/" },
    ],
    searchKeywords: ["bobby", "bob", "business with bob", "business_with_bob", "ai creator", "ai business", "creator economy", "whop alternative", "skool alternative", "uply creator"],
    verified: true,
    creatorType: "Entrepreneur",
    joinedAt: "2025-12-01",
    bookingEmail: "hello@uply.tv",
    location: "Online · Worldwide",
    heroChip: "AI Operator OS — course now live on UPLY",
    bookingTagline: "Brand deals, podcast guesting, AI consulting — replies same week, every inquiry.",
    marquee: ["BUSINESS WITH BOB", "ALL-IN ON AI", "BUILT ON UPLY", "95% CREATOR PAYOUT"],
    releases: [
      { title: "The AI Operator OS", feat: "Flagship course", year: 2026, tag: "Course", href: "/bobby/courses/ai-operator-os" },
      { title: "Whop vs Skool vs UPLY — the teardown", feat: "Long read", year: 2026, tag: "Article", href: "/bobby/blog/whop-skool-vs-uply" },
      { title: "Why I went all-in on AI", feat: "Manifesto", year: 2026, tag: "Article", href: "/bobby/blog/all-in-on-ai" },
    ],
    milestones: [
      { year: "2022", text: "Quit the agency. Started Business with Bob as a one-person operation." },
      { year: "2024", text: "Rebuilt every internal workflow around AI agents — 10x output, same headcount." },
      { year: "2025", text: "Tested Whop, Skool, Kajabi, Circle — moved everything to UPLY." },
      { year: "2026", text: "AI Operator OS launches on UPLY. Course + community + live in one place." },
    ],
    stats: [
      { k: "Followers", v: "Growing fast" },
      { k: "Stack", v: "AI-first" },
      { k: "Platform", v: "UPLY" },
      { k: "Payout", v: "95% to creator" },
    ],
    featuredPostSlug: "all-in-on-ai",
    posts: [
      {
        slug: "all-in-on-ai",
        title: "Why I went all-in on AI — and never looked back",
        excerpt: "I cancelled five contractors, rebuilt every workflow around AI agents, and grew faster than I ever did with a team. Here's exactly what I did, what broke, and what to copy.",
        readTime: "8 min read",
        publishedAt: "2026-06-20",
        tag: "Manifesto",
        body:
          "For most of 2023 I ran Business with Bob the way every other creator-founder ran their shop: a small stack of contractors, a project manager, three Slack channels, and a content calendar that lived or died on someone else's bandwidth.\n\n" +
          "Then in early 2024 I did the math. Between editors, a VA, a designer, and an ads guy, I was paying about $8.4K a month before I shipped a single piece of content. My margin wasn't bad — but my speed was awful. Every idea had to travel through four humans before it hit a feed.\n\n" +
          "So I ran an experiment. For 30 days I'd replace every workflow I could with an AI agent and see what survived.\n\n" +
          "Editing? Replaced with an AI cut-down pipeline that pulls hooks, captions, and shorts from every long-form. Designer? Replaced with a templated Figma-to-Canva pipeline driven by Claude. Email and DM triage? Routed through an inbox agent that drafts replies in my voice. Research? An agent that reads my niche every morning and drops a brief in Notion before I'm awake.\n\n" +
          "By day 23 I cancelled five of the seven contractors. By day 30 my output had tripled. By day 60 I'd shipped my first paid AI workflow course — entirely written, edited, and launched solo.\n\n" +
          "Here's what I learned the hard way:\n\n" +
          "1. AI is not a tool. It's an operator. Stop pasting prompts into a chat window and start building agents that own a job end-to-end.\n\n" +
          "2. The bottleneck is never the model. It's the workflow design. If you can't draw your process on a napkin, no LLM is going to fix it for you.\n\n" +
          "3. The 95% payout matters more than the followers. When your AI stack lets you ship twice as fast, the platform fees become the biggest line item. That's the entire reason I'm building on UPLY now — every other platform was quietly eating my margin.\n\n" +
          "The takeaway: AI didn't replace my team. It replaced my excuse not to ship.",
      },
      {
        slug: "whop-skool-vs-uply",
        title: "I tested Whop and Skool for 90 days. UPLY won — and it wasn't close.",
        excerpt: "Side-by-side: course hosting, community, payments, analytics, and creator payout. The numbers (and the product gaps) made the decision for me.",
        readTime: "10 min read",
        publishedAt: "2026-06-12",
        tag: "Teardown",
        body:
          "I get the same DM almost every day: \"Bobby, where should I actually host my course and community?\" For 90 days I stopped guessing and ran a real test on the three platforms creators ask me about most — Whop, Skool, and UPLY.\n\n" +
          "Same offer. Same audience. Same launch cadence. Different homes.\n\n" +
          "Here's the short version: Whop is great if you only care about gated Discord communities and digital product checkouts. Skool is a clean community-and-course combo, but it stops at the door — no live, no link-in-bio, no native short-form, no real analytics, and the 'free' tier evaporates the second you scale.\n\n" +
          "UPLY just kept showing up with the next feature I needed already built in.\n\n" +
          "**What other platforms charged extra for (or didn't have at all):**\n\n" +
          "• Native live streaming with chat — UPLY has it; Whop and Skool don't.\n" +
          "• Link-in-bio + full editorial site — UPLY ships this with every creator profile.\n" +
          "• Built-in short-form feed and clip discovery — UPLY only.\n" +
          "• Real creator analytics (revenue, members, retention) — UPLY's dashboard is closer to a real CRM than a content tool.\n" +
          "• Direct messaging that the creator actually owns — not bolted on through a third-party Discord.\n\n" +
          "**The payout:** Whop and Skool take a meaningful cut once you stack their fees with Stripe. UPLY's 5% platform fee on top of Stripe is the lowest of the three by a wide margin. On a $50K month that single difference paid for a contractor.\n\n" +
          "**The product gaps that broke me on the others:**\n\n" +
          "Whop forced me to push community traffic into Discord — which meant I didn't own the relationship and couldn't message my members directly without their permissions stack. Skool's course UI is clean, but I couldn't go live, couldn't run a presale, couldn't run a tip jar, and couldn't see who my top spenders were without exporting CSVs.\n\n" +
          "UPLY gave me one URL — /bobby — that does the job of a link-in-bio, a course platform, a community, a live channel, a newsletter, and a checkout. One login. One payout. One audience.\n\n" +
          "If you're picking your first platform: don't pick the one with the best landing page. Pick the one you won't have to migrate off in 18 months. That was UPLY for me.",
      },
      {
        slug: "ai-operator-os-launch",
        title: "Launching the AI Operator OS on UPLY — and why I'm not putting it anywhere else",
        excerpt: "My new course teaches the exact 11 AI workflows that replaced my team. It lives on UPLY, and here's why that decision matters more than the curriculum.",
        readTime: "5 min read",
        publishedAt: "2026-05-30",
        tag: "Launch",
        body:
          "Today I'm launching the AI Operator OS — the full playbook I used to rebuild Business with Bob around AI agents and triple my output without adding headcount.\n\n" +
          "The course is 11 modules: inbox, content, research, design, sales, ads, analytics, customer ops, hiring, finance, and the one most creators skip — your own daily operating rhythm.\n\n" +
          "I could have put it on Whop. I could have put it on Skool. I chose UPLY because of one number: 95%. Every dollar a student spends, 95 cents lands in my account. That's not normal in this industry, and it's the reason I can keep the price reasonable and still fund the next thing.\n\n" +
          "If you've been on the fence about going all-in on AI, this is the course. And if you're a fellow creator still picking a platform — come build on UPLY. The math is just better.",
      },
    ],
    community: {
      name: "Bob's Inner Circle",
      description: "Weekly AI workflow drops, behind-the-scenes of every launch, and direct access to Bobby in a private members-only feed.",
      membersLabel: "Just launched",
      perks: [
        "Weekly AI workflow + prompt drop",
        "Private member feed with Bobby",
        "Monthly live AMA on AI, ops & creator economics",
        "First access to every new course and tool",
      ],
      priceUsd: 19,
    },
    courses: [
      {
        slug: "ai-operator-os",
        title: "The AI Operator OS",
        level: "All Levels",
        lessons: 11,
        duration: "4h 20m",
        priceUsd: 149,
        summary: "The exact 11 AI agent workflows Bobby uses to run Business with Bob solo — inbox, content, research, design, sales, ads, analytics, ops, hiring, finance, and your daily operating rhythm.",
        outline: [
          "Designing your AI operator stack from scratch",
          "Inbox & DM triage agents that draft in your voice",
          "Content factory: long-form → clips → posts in one pipeline",
          "Research agents that brief you before you're awake",
          "Design pipeline: Figma → Canva → ship in 10 minutes",
          "Sales & objection-handling agents for your DMs",
          "Ad creative generation and rapid iteration",
          "Analytics agents that report to you, not the other way around",
          "Customer ops without a support team",
          "Hiring and onboarding (humans + agents)",
          "Your daily AI-first operating rhythm",
        ],
      },
      {
        slug: "creator-platform-playbook",
        title: "The Creator Platform Playbook",
        level: "Beginner",
        lessons: 5,
        duration: "1h 30m",
        priceUsd: 0,
        summary: "Free companion to the Whop vs Skool vs UPLY teardown — pick the right platform the first time, set up your link-in-bio, course, and community in one weekend.",
        outline: [
          "How to actually evaluate a creator platform (the 9-point checklist)",
          "Setting up your /handle the right way",
          "Pricing your community + course without leaving money on the table",
          "The 4 launch posts every creator should ship in week one",
          "Migrating from Whop / Skool / Kajabi without losing members",
        ],
      },
    ],
  },

  // ============================================================
  // SAMUEL ONUHA — Founder of ICON · $40M/yr operator
  // ============================================================
  {
    slug: "sonuha",
    aliases: ["samuel-onuha", "samuelonuha", "icon", "icon-brand", "samuel"],
    displayName: "Samuel Onuha",
    eyebrow: "Founder of ICON & Millionaire · 1M followers",
    tagline: "$40,000,000 a year selling products online. Now teaching 90-day ELITE mentorship students how to do the same.",
    bio:
      "Samuel Onuha is the founder of ICON and Millionaire — and one of the most-watched e-commerce operators on Instagram, with over 1M followers tracking his daily build.\n\n" +
      "He does $40,000,000 a year selling products online. Born and raised between the Netherlands and Dubai, now operating out of the US, Samuel has built a global brand machine across three continents.\n\n" +
      "After years of DMs asking how he did it, he opened up his 90-day ELITE mentorship — the unfiltered version of the playbook his own team runs on. This is the front door: course, community, and direct access.",
    gradient: { from: "#1a1208", to: "#000000" },
    accent: "#D4A857",
    portraitUrl: "/__l5e/assets-v1/2ffb7196-baa4-4f33-85c5-67ebe4b07a79/sonuha-portrait.jpg",
    
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@sonuha · 1M followers · verified", href: "https://www.instagram.com/sonuha", handle: "sonuha" },
      { kind: "instagram", label: "@icon", sub: "Follow the ICON brand", href: "https://www.instagram.com/icon", handle: "icon" },
      { kind: "instagram", label: "@millionaire", sub: "Follow Millionaire", href: "https://www.instagram.com/millionaire", handle: "millionaire" },
      { kind: "threads", label: "Threads", sub: "@sonuha", href: "https://www.threads.net/@sonuha", handle: "sonuha" },
      { kind: "tiktok", label: "TikTok", sub: "@sonuha · 60-sec breakdowns", href: "https://www.tiktok.com/@sonuha", handle: "sonuha" },
      { kind: "website", label: "Case Study", sub: "to.millionaire-commerce.com/case-study", href: "https://to.millionaire-commerce.com/case-study" },
      { kind: "email", label: "ELITE Mentorship", sub: "DM \"ELITE\" on Instagram to apply", href: "https://www.instagram.com/sonuha" },
    ],
    videos: [
      { title: "Latest from @sonuha", instagramUrl: "https://www.instagram.com/sonuha/" },
    ],
    searchKeywords: ["samuel onuha", "sonuha", "icon brand", "icon", "millionaire", "millionaire commerce", "8 figure ecom", "netherlands entrepreneur", "dubai entrepreneur", "us ecommerce", "40 million revenue", "scaling dtc", "elite mentorship"],
    verified: true,
    creatorType: "Entrepreneur",
    joinedAt: "2026-05-01",
    bookingEmail: "hello@uply.tv",
    location: "Netherlands · Dubai · United States",
    heroChip: "ELITE 90-Day Mentorship — applications open",
    bookingTagline: "DM \"ELITE\" on @sonuha to apply for the 90-day mentorship. Speaking, partnerships & press handled here.",
    marquee: ["SAMUEL ONUHA", "FOUNDER OF ICON & MILLIONAIRE", "$40,000,000 / YEAR", "1M FOLLOWERS", "NETHERLANDS · DUBAI · US"],
    releases: [
      { title: "ELITE 90-Day Mentorship", feat: "Flagship program", year: 2026, tag: "Mentorship", href: "/sonuha/courses/icon-operator-program" },
      { title: "Free Case Study", feat: "to.millionaire-commerce.com", year: 2026, tag: "Free", href: "https://to.millionaire-commerce.com/case-study" },
      { title: "From the Netherlands to $40M", feat: "Origin story", year: 2026, tag: "Article", href: "/sonuha/blog/netherlands-to-dubai-to-us" },
    ],
    milestones: [
      { year: "2016", text: "Started his first DTC offer from a bedroom in the Netherlands." },
      { year: "2019", text: "Relocated to Dubai. Cracked paid traffic at scale." },
      { year: "2022", text: "Launched ICON — crossed $10M in year one." },
      { year: "2024", text: "Moved US operations stateside. Crossed $40M in annual revenue." },
      { year: "2026", text: "Opens the ICON Operator Program on UPLY to teach the playbook." },
    ],
    stats: [
      { k: "Annual revenue", v: "$40M+" },
      { k: "Markets", v: "NL · UAE · US" },
      { k: "Brand", v: "ICON" },
      { k: "Payout", v: "95% via UPLY" },
    ],
    featuredPostSlug: "netherlands-to-dubai-to-us",
    posts: [
      {
        slug: "netherlands-to-dubai-to-us",
        title: "From the Netherlands to Dubai to the US — how I built ICON to $40M a year",
        excerpt: "Three continents, three operating models, one obsession. The honest version of how ICON went from a bedroom in Amsterdam to an 8-figure DTC machine.",
        readTime: "9 min read",
        publishedAt: "2026-06-22",
        tag: "Origin",
        body:
          "When people see the ICON numbers now they assume it was always like this. It wasn't. The first 18 months looked exactly like every other failing brand on Instagram — wrong offer, wrong audience, ad account that hated me, and a bank account that hated me more.\n\n" +
          "I want to walk through the three chapters honestly, because each one taught me something the next one couldn't have.\n\n" +
          "**Chapter 1 — The Netherlands. The offer years.**\n\n" +
          "I started in Amsterdam with a small product and a smaller budget. Everything I made for the first two years went straight back into testing offers. Not ads. Not creative. Offers. What I learned in the Netherlands is that the offer carries the brand — not the other way around. If the offer doesn't make sense on a napkin, no amount of paid traffic is going to save it.\n\n" +
          "**Chapter 2 — Dubai. The paid traffic years.**\n\n" +
          "I moved to Dubai once the offer was working. Different ecosystem, different operators, a network that actually thinks in 8 figures as a starting line. That's where I cracked paid traffic at scale — not by being smarter, but by being around people who'd already done it. ICON went from a profitable side bet to a real brand inside of 12 months because I finally had a peer group that pushed the numbers up.\n\n" +
          "**Chapter 3 — The US. The operations years.**\n\n" +
          "Moving operations to the US was the hardest of the three. Bigger market, harder logistics, real competitors with real budgets. What worked in Dubai didn't automatically work in the US — and that's the lesson most operators miss. Every new market is a new business. The brand stays. The playbook gets rewritten.\n\n" +
          "Today ICON does over $40M a year. The honest answer to how is: I refused to skip a chapter. Most people try to start at chapter three. There is no chapter three without the first two.",
      },
      {
        slug: "icon-playbook",
        title: "The ICON playbook — the 6 things I'd tell my younger self",
        excerpt: "The exact six decisions that separated ICON from every brand I tried before it. None of them are tactics — and that's the point.",
        readTime: "7 min read",
        publishedAt: "2026-06-10",
        tag: "Playbook",
        body:
          "Everyone wants the tactic. The ad account screenshot. The funnel diagram. The hook formula. I've shipped all of them on Instagram and I'll keep shipping them, but if I could only tell my younger self six things, none of them would be a tactic.\n\n" +
          "**1. Pick the offer like your life depends on it.** Because it does. The offer is the only variable you cannot fix later with budget.\n\n" +
          "**2. Move to the room with bigger numbers.** Dubai changed me because the conversations were already at the level I was trying to reach. Your environment is your ceiling.\n\n" +
          "**3. Hire operators, not specialists, in year one.** Specialists optimize. Operators ship. You need shipping more than optimization for the first $10M.\n\n" +
          "**4. Pay yourself last, but pay yourself.** Founders who never take a salary burn out. Founders who pay themselves first kill the brand. Last — but always.\n\n" +
          "**5. Own the audience.** Every dollar that lives inside someone else's platform is rented. Every dollar that lives inside your own list, your own creator profile, your own checkout — is yours. This is why I moved everything to UPLY: my links, my course, my community, my direct line to the audience. One URL.\n\n" +
          "**6. The brand is the moat.** You can't be cheaper than your competitor forever. You can be the brand they can't copy. ICON works because it's a brand first, a product second.\n\n" +
          "If you do these six in order, you'll skip about three years of pain. If you skip any of them, no playbook will help.",
      },
      {
        slug: "why-i-teach-now",
        title: "Why I'm finally teaching this — and why it lives on UPLY",
        excerpt: "I spent eight years saying no to teaching. Here's what changed, and why the ICON Operator Program lives on UPLY and nowhere else.",
        readTime: "5 min read",
        publishedAt: "2026-05-28",
        tag: "Announcement",
        body:
          "For eight years I said no every time someone asked me to teach. The answer was always the same — I'd rather build the brand than talk about building the brand.\n\n" +
          "Two things changed. First, the questions in my DMs started repeating word-for-word. Every week, same five questions from operators who were one decision away from getting it right. Second, my team kept telling me the playbook was wasted if it only lived inside ICON.\n\n" +
          "So I built the ICON Operator Program — the same internal training my own team gets when they join, opened up to outside operators who want the unfiltered version.\n\n" +
          "Why UPLY? Because the platforms I'd normally use take a meaningful cut of every dollar a student pays. UPLY's 95% creator payout means I can keep the price honest and still fund the next thing. Course, community, live calls, direct messaging — all on one URL. /sonuha. That's the entire stack.\n\n" +
          "If you've been waiting for the playbook, this is it.",
      },
    ],
    community: {
      name: "The ICON Inner Circle",
      description: "Private members-only feed with Samuel: weekly operator notes, live teardowns, and direct DM access for serious operators.",
      membersLabel: "Limited intake",
      perks: [
        "Weekly operator notes from Samuel",
        "Monthly live brand teardown (paid ads, offer, funnel)",
        "Private member feed + direct DM channel",
        "First seat for every cohort, masterclass, and event",
      ],
      // Premium mastermind — no public price; prospects apply via the booking form.
      priceUsd: 49,
      contactForPricing: true,
    },
    courses: [
      {
        slug: "icon-operator-program",
        title: "The ICON Operator Program",
        level: "Advanced",
        lessons: 12,
        duration: "8h 45m",
        // Premium mentorship — no public price; prospects apply via the booking form.
        priceUsd: 997,
        contactForPricing: true,
        summary: "The exact internal training Samuel runs his ICON team through — opened up to outside operators. Offer, paid traffic, retention, ops, hiring, and the operating rhythm behind a $40M brand.",
        outline: [
          "How to pick an offer that survives paid traffic",
          "The creative system that prints winning ads on demand",
          "Scaling paid traffic past $1M / month without breaking margin",
          "Retention, LTV, and the second-purchase obsession",
          "Building an operator team across multiple time zones",
          "The financial model behind an 8-figure brand",
          "Hiring senior operators (and firing nicely)",
          "Inventory, fulfilment, and the unsexy bottlenecks",
          "Expanding into a new market without breaking the brand",
          "Brand vs. performance — and why you need both",
          "The Samuel weekly operating cadence",
          "Live cohort Q&A archive",
        ],
      },
      {
        slug: "operator-foundations",
        title: "Operator Foundations (Free)",
        level: "Beginner",
        lessons: 4,
        duration: "55m",
        priceUsd: 0,
        summary: "Free intro from Samuel: the four decisions that separate operators who make it from operators who stall. The same talk he opens every cohort with.",
        outline: [
          "The offer test — does it survive paid traffic?",
          "The environment test — are you in the right room?",
          "The team test — operators vs. specialists",
          "The audience test — who actually owns it?",
        ],
      },
    ],
  },

  // ============================================================
  // ARIAN SHAHBAZI — founder story / personal profile
  // ============================================================
  {
    slug: "arian-shahbazi",
    aliases: ["arian", "ari", "arishahbazi-personal", "founder"],
    displayName: "Arian Shahbazi",
    eyebrow: "Founder · Builder · Father of twins",
    tagline: "From tech to fatherhood to building UPLY — documenting the work, the risk, and the life around it.",
    bio:
      "Arian Shahbazi is the founder building UPLY — a creator platform designed so talent can own their audience, their monetization, and their brand without stitching together five different tools. His background is in tech, product, and operator-led building; his present is equal parts founder mode and fatherhood.\n\n" +
      "What changed the story wasn't just another startup idea. It was becoming a dad to twins and seeing time, leverage, and ownership differently. The mission got simpler: build something real, make it useful, and make it matter to people actually creating for a living.\n\n" +
      "This page is the personal side of that story — the founder, the family, and the long road from tech ambition to building UPLY with more clarity than ever.",
    gradient: { from: "#0d1b2a", to: "#0a0a0a" },
    accent: "#D5B06A",
    portraitUrl: "/__l5e/assets-v1/60bebf03-b657-43da-baad-95d795d53730/arian-shahbazi-portrait.jpg",
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@arishahbazi · founder updates", href: "https://www.instagram.com/arishahbazi", handle: "arishahbazi" },
      { kind: "website", label: "UPLY", sub: "The platform Arian is building", href: "https://uply.tv" },
      { kind: "youtube", label: "YouTube", sub: "Founder story, interviews & build logs", href: "https://www.youtube.com/@arishah" },
      { kind: "threads", label: "Threads", sub: "Thoughts on tech, creators & life", href: "https://www.threads.net/@arishahbazi", handle: "arishahbazi" },
      { kind: "email", label: "Contact", sub: "Founder inquiries & press", href: "mailto:hello@uply.tv" },
    ],
    videos: [
      { title: "Follow the founder journey", instagramUrl: "https://www.instagram.com/arishahbazi/" },
    ],
    searchKeywords: ["arian shahbazi", "ari shahbazi", "arishahbazi", "uply founder", "tech founder", "father of twins", "creator economy founder", "uply"],
    verified: true,
    creatorType: "Founder",
    joinedAt: "2025-10-01",
    bookingEmail: "hello@uply.tv",
    location: "Los Angeles · Building globally",
    heroChip: "Building UPLY in public",
    bookingTagline: "Founder conversations, creator economy podcasts, partnerships, and press inquiries handled directly here.",
    marquee: ["ARIAN SHAHBAZI", "TECH → FATHERHOOD → UPLY", "BUILDING FOR CREATORS", "LOS ANGELES · GLOBAL"],
    releases: [
      { title: "Building UPLY", feat: "Founder story", year: 2026, tag: "Feature", href: "/arian-shahbazi/blog/building-uply" },
      { title: "Father of twins", feat: "Life chapter", year: 2026, tag: "Essay", href: "/arian-shahbazi/blog/father-of-twins" },
      { title: "From tech to founder", feat: "Origin story", year: 2026, tag: "Essay", href: "/arian-shahbazi/blog/from-tech-to-uply" },
    ],
    milestones: [
      { year: "Early career", text: "Started in tech, product, and operator-led problem solving." },
      { year: "Fatherhood", text: "Became a father to twins — and rebuilt life around what actually matters." },
      { year: "UPLY", text: "Started building a creator platform with ownership, direct audience, and better economics at the center." },
      { year: "Now", text: "Balancing founder intensity with family life while building UPLY for the next generation of creators." },
    ],
    stats: [
      { k: "Role", v: "Founder" },
      { k: "Current chapter", v: "Dad × Builder" },
      { k: "Mission", v: "Build for creators" },
      { k: "Base", v: "Los Angeles" },
    ],
    gallery: [
      {
        url: "/__l5e/assets-v1/1da785e4-fb9f-4062-92eb-95b4600366f7/arian-shahbazi-twins-car.jpg",
        alt: "Arian's twins sitting on a car during a sunny afternoon",
        caption: "The pace changed when fatherhood entered the picture — everything got more real.",
      },
      {
        url: "/__l5e/assets-v1/cdad2e16-1bf2-41c5-931e-eed4badebf71/arian-shahbazi-swim.jpg",
        alt: "Arian's twins smiling by the pool in swim class",
        caption: "The best reminder that building big means staying present for the small moments too.",
      },
      {
        url: "/__l5e/assets-v1/ad96461d-3b4b-47cf-b4fc-1637c53a2e08/arian-shahbazi-school.jpg",
        alt: "Arian with his twins before school",
        caption: "Morning routines, backpacks, startup calls, and trying to be fully there for both worlds.",
      },
      {
        url: "/__l5e/assets-v1/b4347773-ccae-4e77-98bc-dda71c7df92f/arian-shahbazi-atlantis.jpg",
        alt: "Arian with his twins by the water at sunset",
        caption: "Family time became the lens through which every business decision now gets judged.",
      },
      {
        url: "/__l5e/assets-v1/20e3bcb2-eb81-44ed-a38a-d7bcf7342eda/arian-shahbazi-golf-cart.jpg",
        alt: "Arian and his twins on a golf cart in a tropical setting",
        caption: "The founder journey isn't just grind — it's what that grind is trying to protect.",
      },
      {
        url: "/__l5e/assets-v1/33cd8a3f-760c-460d-9a19-d56c79fac7f6/arian-shahbazi-aref.jpg",
        alt: "Arian Shahbazi standing with respected Persian music figures",
        caption: "Culture, creators, and community are a core reason UPLY exists in the first place.",
      },
    ],
    featuredPostSlug: "from-tech-to-uply",
    posts: [
      {
        slug: "from-tech-to-uply",
        title: "From tech to UPLY — why I had to build this",
        excerpt: "I didn't set out to build just another platform. I set out to solve a problem I'd seen too many creators live through for too long.",
        readTime: "6 min read",
        publishedAt: "2026-06-30",
        tag: "Origin",
        coverUrl: "/__l5e/assets-v1/60bebf03-b657-43da-baad-95d795d53730/arian-shahbazi-portrait.jpg",
        body:
          "My path started in tech — product thinking, systems, leverage, and a constant obsession with how better tools change what people can actually do. That mindset shaped everything early for me. I was always looking for inefficiencies, broken workflows, and places where people were doing too much manual work just to stay afloat.\n\n" +
          "The creator world had this problem everywhere. Great talent, weak infrastructure. People with massive cultural influence were still duct-taping their business together across scattered tools that took too much margin and gave them too little ownership. I kept seeing the same thing: creators could generate attention, but the stack underneath them was fragile.\n\n" +
          "UPLY came out of that frustration. I didn't want to build another layer. I wanted to build the operating system — one place where a creator could own the audience, sell directly, publish content, build community, and actually keep the economics. That's the real origin story.",
      },
      {
        slug: "father-of-twins",
        title: "Becoming a father of twins changed how I build",
        excerpt: "Fatherhood didn't make me less ambitious. It made me more honest about what ambition is actually for.",
        readTime: "5 min read",
        publishedAt: "2026-06-28",
        tag: "Fatherhood",
        coverUrl: "/__l5e/assets-v1/ad96461d-3b4b-47cf-b4fc-1637c53a2e08/arian-shahbazi-school.jpg",
        body:
          "Before kids, time felt abstract. You could always tell yourself you'd recover the weekend, make up the dinner, get it right next month. Then I became a father to twins and time stopped feeling theoretical. Every hour had weight.\n\n" +
          "That changed the way I build companies. I care more about clarity now. More about conviction. Less about noise. If I'm going to miss time, take risk, and carry the pressure of building something from scratch, then it has to be for a mission I actually believe in.\n\n" +
          "Fatherhood didn't soften the mission — it sharpened it. It made me want to build something my kids can one day understand: something real, something useful, and something made with integrity.",
      },
      {
        slug: "building-uply",
        title: "Building UPLY while raising twins",
        excerpt: "The company and the family are not separate stories. They're the same story told under different pressure.",
        readTime: "7 min read",
        publishedAt: "2026-06-26",
        tag: "Builder life",
        coverUrl: "/__l5e/assets-v1/b4347773-ccae-4e77-98bc-dda71c7df92f/arian-shahbazi-atlantis.jpg",
        body:
          "There is no perfect balance. Anyone building a real company while raising young kids knows that. There are just tradeoffs, priorities, and the daily work of trying to be where you are.\n\n" +
          "Some days I'm deep in product decisions, creator flows, growth mechanics, and platform economics. Other days start with school bags, swim goggles, or wiping down a car with two kids who think that counts as a major operation. Both matter.\n\n" +
          "Building UPLY in this season of life gave the company a different soul. It's not abstract ambition anymore. It's rooted. The platform is about ownership, direct connection, and building something durable — the same values I care about at home.",
      },
    ],
    community: {
      name: "Founder Notes",
      description: "Occasional founder essays, product thinking, behind-the-scenes reflections on UPLY, and honest notes on building while raising twins.",
      membersLabel: "Private founder circle",
      perks: [
        "Monthly founder memo",
        "Behind-the-scenes product notes from UPLY",
        "Direct reflections on family, work, and building",
        "Early access to selected founder sessions",
      ],
      priceUsd: 0,
    },
    courses: [
      {
        slug: "founder-operator-notes",
        title: "Founder / Operator Notes",
        level: "All Levels",
        lessons: 5,
        duration: "1h 20m",
        priceUsd: 0,
        summary: "A short founder series on product thinking, platform conviction, and building with real constraints.",
        outline: [
          "Why ownership matters in creator products",
          "What most platforms get wrong",
          "Building with constraints instead of waiting for perfect",
          "Fatherhood, focus, and decision quality",
          "How UPLY is being shaped in real time",
        ],
      },
    ],
  },

  // ============================================================
  // BLAKE THE GREAT — trader & sports-betting educator
  // NOTE: numbers/claims are [Blake: …] placeholders pending his
  // sign-off — see BLAKE-ONBOARDING.md. Never fill these in for him.
  // His legacy bespoke pages (/blake, /blake-the-great/*) stay live.
  // ============================================================
  {
    slug: "blake",
    aliases: ["blakethegreat", "blakethegreat1312"],
    displayName: "Blake The Great",
    eyebrow: "Trader · Sports-Betting Educator · California",
    tagline: "Risk first. Discipline always. Markets and the sportsbook, taught straight.",
    bio:
      "Blake The Great is a California-based trader and sports-betting educator who teaches one thing above everything else: decide what you're willing to lose before you ever think about what you might win.\n\n" +
      "His teaching runs on two tracks — the Stock Trading Floor, where the curriculum is process, position sizing, and stop-loss discipline; and the Betting Desk, where it's bankroll units, line value, and knowing when to walk away. Different arenas, same rule: the downside gets sized first.\n\n" +
      "Everything Blake publishes is education, not advice. Trading involves risk of loss. Sports-betting content is for entertainment and education only — 21+, where legal, bet responsibly.",
    gradient: { from: "#241703", to: "#0a0a0a" },
    accent: "#E8A33D",
    portraitUrl: "/__l5e/assets-v1/47618b4d-72f6-486b-a722-c97b7abdb8a2/blake-portrait.jpg",
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@blakethegreat1312", href: "https://www.instagram.com/blakethegreat1312", handle: "blakethegreat1312" },
      { kind: "website", label: "X / Twitter", sub: "Trade & bet education threads", href: "https://x.com/search?q=blakethegreat1312" },
      { kind: "email", label: "Email Blake", sub: "blake@blakethegreat.com", href: "mailto:blake@blakethegreat.com" },
    ],
    videos: [
      { title: "Latest from @blakethegreat1312", instagramUrl: "https://www.instagram.com/blakethegreat1312/" },
    ],
    searchKeywords: [
      "blake", "blake the great", "blakethegreat", "blakethegreat1312",
      "trading educator", "risk management", "position sizing", "stop loss",
      "bankroll management", "sports betting education", "responsible gambling",
      "trader", "war room",
    ],
    verified: false,
    creatorType: "Trader",
    joinedAt: "2026-07-01",
    bookingEmail: "blake@blakethegreat.com",
    location: "California",
    heroChip: "Blake's War Room — founding members now enrolling",
    bookingTagline:
      "Workshops, speaking, podcasts, and creator collabs on trading discipline and responsible-betting education. Tell me the audience and the goal — replies within the week.",
    marquee: [
      "RISK FIRST · ALWAYS",
      "SIZE THE LOSS BEFORE THE WIN",
      "MARKETS · SPORTSBOOK · ONE DISCIPLINE",
      "EDUCATION ONLY — NOT FINANCIAL ADVICE",
    ],
    milestones: [
      { year: "[Blake: year]", text: "[Blake: when and how you started trading — one line in your words.]" },
      { year: "[Blake: year]", text: "[Blake: the moment risk management became rule #1 — one line.]" },
      { year: "[Blake: year]", text: "[Blake: when the sportsbook entered the picture, and why discipline carried over.]" },
      { year: "2026", text: "Launched Blake's War Room on UPLY — trading and betting education under one roof." },
    ],
    stats: [
      { k: "Years trading", v: "[Blake: #]" },
      { k: "Teaching", v: "Risk-first process" },
      { k: "Tracks", v: "Markets · Sportsbook" },
      { k: "Based in", v: "California" },
    ],
    featuredPostSlug: "risk-first-the-only-trading-lesson",
    posts: [
      {
        slug: "risk-first-the-only-trading-lesson",
        title: "Risk first: the only trading lesson that matters",
        excerpt:
          "Most new traders study entries. Blake teaches the opposite order: decide your exit, size your loss, and let the entry be the last thing you think about.",
        readTime: "5 min read",
        publishedAt: "2026-07-10",
        tag: "Trading",
        body:
          "Ask a new trader what they're studying and you'll hear the same answers: chart patterns, indicators, entries. Ask them what they're risking on their next trade and you'll usually get silence, or worse — a shrug. That order is backwards, and it's the reason most people who open a brokerage account never make it through their first year with their capital intact.\n\n" +
          "Here's the order I teach in the War Room: exit, size, then entry. Last, not first.\n\n" +
          "Start with the exit because the exit is the only part of a trade you fully control. The market decides whether your idea was right. You decide — in advance, in writing — the price where the idea is proven wrong. That's your stop. If you can't name the price where you're wrong, you don't have a trade; you have a hope with a ticker symbol attached.\n\n" +
          "Then size the position from the stop, not from your conviction. The math is simple and it never changes: pick the fraction of your account you're willing to lose if the stop gets hit, measure the distance between your entry and your stop, and let those two numbers set your share count. Conviction doesn't get a vote. The most dangerous phrase in trading is 'I'm really sure about this one' — because that's the trade people oversize, and the oversized trade is the one that ends accounts.\n\n" +
          "Notice what this does psychologically. When your worst case is decided and small, you can actually follow your plan. You're not staring at every tick, because the question 'what if it goes against me?' was answered before you clicked buy. Losing trades stop being emergencies and start being what they actually are: a routine business expense, budgeted in advance.\n\n" +
          "And when the stop hits, you take it. No moving it 'just this once.' No averaging down to make the pain stop. A stop you won't honor is worse than no stop at all, because it lets you pretend you have a risk plan while you're actually just gambling with extra steps.\n\n" +
          "Will risk-first trading make you money? I can't promise that, and you should sprint away from anyone who does. What it will do is keep you in the game long enough to learn — and staying in the game is the entire fight for a new trader. Nobody develops judgment in six weeks. Your first job isn't to win. Your first job is to survive your own education.\n\n" +
          "That's the foundation of everything I teach on the Stock Trading Floor inside Blake's War Room, and it's the first module of my Trading Foundations course. If you want to learn process instead of predictions, join at /blake/community — bring a notebook, not a wishlist.\n\n" +
          "Educational content only — not financial advice; trading involves risk of loss. Never trade with money you cannot afford to lose.",
      },
      {
        slug: "bankroll-management-is-the-whole-game",
        title: "Bankroll management is the whole game",
        excerpt:
          "Units, expected value, and the discipline to stop — why the boring math of bankroll management matters more than any pick you'll ever make.",
        readTime: "5 min read",
        publishedAt: "2026-07-08",
        tag: "Betting",
        body:
          "Everyone wants picks. Nobody wants a ledger. And that, right there, is why most people who bet on sports lose more than they planned to — not because their picks were terrible, but because they never decided what a bet was worth before they placed it.\n\n" +
          "Let's fix the order of operations.\n\n" +
          "First: your bankroll is entertainment money, full stop. It's an amount you set aside that your life does not need — not rent, not savings, not the credit card. If losing the entire bankroll would change your month, the bankroll is too big. This isn't a footnote; it's the first rule of the Betting Desk, and I don't teach anything else until it's settled.\n\n" +
          "Second: units, not dollars, not feelings. A unit is a small, fixed slice of your bankroll — commonly one or two percent — and it becomes the only language you bet in. One unit on a standard play. Never a pile because you're 'sure,' never double because you're down. The moment your bet size starts responding to your emotions instead of your system, you've stopped betting and started chasing — and chasing is how a bad weekend becomes a bad year.\n\n" +
          "Third: understand what you're actually up against. The book charges you a fee on every bet — the vig — which means a coin-flip bet at standard odds needs to win more than half the time just to break even. This is expected value, and it's the most sobering math in sports. Most bets available on any given night are negative expected value for you. The number on the screen isn't a prediction; it's a price. Learning to ask 'is this price wrong?' instead of 'who's going to win?' is the entire difference between betting as a discipline and betting as a lottery ticket.\n\n" +
          "Fourth: write everything down. Every bet, every unit, every result, in a ledger you review weekly. Not because the spreadsheet makes you money — because it makes you honest. Memory is a salesman; it remembers the parlay that hit and forgets the eleven that didn't. The ledger remembers everything, and what it usually says is: bet less, bet slower.\n\n" +
          "And fifth — the rule that sits above all the others: know when to stop. Set a loss limit for the week before the week starts, and when you hit it, you're done until the next one. Done means done. Betting should be something you do for enjoyment with money you've budgeted for it. The moment it stops feeling like entertainment and starts feeling like a need, that's not a betting problem to manage — it's a signal to step away and talk to someone.\n\n" +
          "Inside Blake's War Room, the Betting Desk teaches exactly this — units, value, record-keeping, and limits — with templates you can use from day one. Join at /blake/community if you want the discipline, not the lottery ticket.\n\n" +
          "Entertainment and education only · 21+ · where legal · bet responsibly. If gambling is affecting you or someone you care about, call 1-800-GAMBLER.",
      },
      {
        slug: "why-i-teach-both-markets-and-the-sportsbook",
        title: "Why I teach both markets and the sportsbook",
        excerpt:
          "Two arenas, one discipline. Blake on why trading and betting education belong in the same room — and what the War Room's two desks actually cover.",
        readTime: "4 min read",
        publishedAt: "2026-07-06",
        tag: "Community",
        body:
          "People ask me why I teach trading and sports betting side by side, as if they're two different personalities fighting over one account. They're not. They are the same skill wearing two different jerseys — and teaching them together is the fastest way I know to make the skill stick.\n\n" +
          "Here's what both arenas actually are, stripped of the highlights and the screenshots: making decisions with real money under uncertainty, where the outcome of any single decision tells you almost nothing, and only your process — repeated hundreds of times — tells you the truth.\n\n" +
          "In the market, the discipline is called position sizing and stop-losses. At the book, it's called units and loss limits. Different vocabulary, identical spine: decide the downside first, keep every single risk small, write everything down, and never let a result — good or bad — change the size of your next decision. Someone who learns risk-first thinking on a stock chart recognizes it instantly in a bankroll ledger, and vice versa. Teach the spine once and both arenas make sense; teach picks and signals and neither ever will.\n\n" +
          "There's a second reason I teach both, and it's the more honest one: the crossover crowd already exists. The same person trading on their phone at lunch is firing a parlay on Sunday. Most of the content aimed at that person is engineered to make them feel one inch away from easy money in both arenas at once. I'd rather be the voice in that feed saying the unglamorous thing — the downside comes first, the math is against the impatient, and anyone selling certainty is selling something else.\n\n" +
          "So that's what Blake's War Room is. One community, two desks. The Stock Trading Floor covers markets education: process, position sizing, risk management, trade journaling. The Betting Desk covers sports-betting discipline: bankroll units, what a line is really telling you, expected value, record-keeping, and — non-negotiable — limits and responsible play. Same room, same rule set, because it's the same skill.\n\n" +
          "If you want structured versions of both tracks, the two courses are live at /blake/courses — Trading Foundations for the markets side, Smart Betting 101 for the sportsbook side. If you want the ongoing room — the breakdowns, the worksheets, the live Q&As — the front door is /blake/community.\n\n" +
          "One more thing before you join: I don't sell wins, I teach discipline. Trading content is educational only — not financial advice, and trading involves risk of loss. Betting content is entertainment and education only — 21+, where legal, bet responsibly, and if it ever stops being fun, call 1-800-GAMBLER. If that framing disappoints you, the War Room isn't your room — and that's exactly how I want it.",
      },
    ],
    community: {
      name: "Blake's War Room",
      description:
        "One community, two desks. The Stock Trading Floor: markets education built on process, position sizing, and risk management. The Betting Desk: sports-betting discipline built on bankroll units, line value, and limits. Education only — never financial advice; betting content 21+ · where legal · bet responsibly.",
      membersLabel: "Founding members — now enrolling",
      perks: [
        "Trading Floor · weekly market-process breakdowns (education, not signals)",
        "Trading Floor · position-sizing and stop-loss worksheets",
        "Betting Desk · bankroll and unit-tracking templates",
        "Betting Desk · reading lines and finding value — education only",
        "Both desks · live monthly Q&A with Blake",
        "Both desks · members-only feed, archive, and trade/bet journals",
      ],
      // Placeholder price pending Blake's sign-off — mirrors his legacy
      // Blueprint membership ($97/mo) so surfaces stay consistent.
      priceUsd: 97,
    },
    courses: [
      {
        slug: "trading-foundations",
        title: "Trading Foundations",
        level: "Beginner",
        lessons: 8,
        duration: "[TBC]",
        priceUsd: 149,
        summary:
          "Blake's risk-first introduction to the markets — exits before entries, position sizing before conviction, and the discipline to survive long enough to learn. Educational content only — not financial advice; trading involves risk of loss.",
        outline: [
          "The risk-first mindset: why the downside gets decided first",
          "Position sizing: let the stop set the share count, not your conviction",
          "Stop-losses that actually stop you — and why moving them ends accounts",
          "Reading a chart without fooling yourself",
          "The written trade plan: one page, no exceptions",
          "The trade journal: your only honest teacher",
          "Tilt, revenge trades, and the discipline to walk away",
          "Full process walk-through: a trade from idea to journal entry",
        ],
      },
      {
        slug: "smart-betting-101",
        title: "Smart Betting 101",
        level: "Beginner",
        lessons: 7,
        duration: "[TBC]",
        priceUsd: 99,
        summary:
          "Bankroll discipline for people who bet on sports — units, expected value, record-keeping, and hard limits. Entertainment and education only · 21+ · where legal · bet responsibly. If gambling stops being fun, call 1-800-GAMBLER.",
        outline: [
          "Betting as entertainment: setting a bankroll your life doesn't need",
          "Units: the sizing math that keeps you in the game",
          "What a line is actually telling you (it's a price, not a prediction)",
          "Expected value and the vig: why 'locks' don't exist",
          "Line shopping: paying less for the same bet",
          "The ledger: tracking every bet like a business expense",
          "Limits, cool-offs, and knowing when to stop — responsible play, always",
        ],
      },
    ],
    disclaimers: [
      "Trading content: educational content only — not financial advice; trading involves risk of loss. Never trade with money you cannot afford to lose.",
      "Sports-betting content: entertainment and education only · 21+ · where legal · bet responsibly. Problem gambling help: call 1-800-GAMBLER.",
    ],
  },

  // ============================================================
  // AARUSH NIJHAWAN — marketer & short-form content educator
  // NOTE: numbers/claims are [Aarush: …] placeholders pending his
  // sign-off — see AARUSH-ONBOARDING.md. Never fill these in for him.
  // Portrait intentionally omitted — awaiting an uploaded photo;
  // do NOT scrape or hotlink Instagram images.
  // ============================================================
  {
    slug: "aarush",
    aliases: ["aarushnijha", "aarush-nijhawan"],
    displayName: "Aarush Nijhawan",
    eyebrow: "Marketer · Short-Form Educator · Edison, NJ",
    tagline: "Short-form content and marketing systems for creators and small brands.",
    bio:
      "Aarush Nijhawan is the founder of Rush Impact Media, a digital marketing brand helping creators and small businesses grow with short-form content and simple, repeatable marketing systems.\n\n" +
      "He studies at Rutgers–New Brunswick and works out of Edison, NJ. His teaching focus is practical: pick your pillars, batch the work, write hooks that stop the scroll, and measure the handful of numbers that actually move the business — instead of drowning in dashboards.\n\n" +
      "Everything he publishes is education and opinion, not guaranteed results. Marketing outcomes depend on your product, your market, and your consistency.",
    gradient: { from: "#0d0a24", to: "#0a0a0a" },
    accent: "#6B5BFF",
    // portraitUrl intentionally omitted — awaiting an uploaded photo.
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@aarushnijha", href: "https://www.instagram.com/aarushnijha", handle: "aarushnijha" },
    ],
    videos: [
      { title: "Latest from @aarushnijha", instagramUrl: "https://www.instagram.com/aarushnijha/" },
    ],
    searchKeywords: [
      "aarush", "aarush nijhawan", "aarushnijha", "rush impact media",
      "short form content", "content marketing", "creator marketing",
      "marketing systems", "content batching", "rutgers", "edison nj",
      "marketer", "educator",
    ],
    verified: false,
    creatorType: "Marketer",
    joinedAt: "2026-07-01",
    // bookingEmail intentionally omitted — [Aarush: confirm public email].
    location: "Edison, NJ",
    heroChip: "The Rush — founding members now enrolling",
    bookingTagline:
      "Workshops, consulting, and creator collabs on short-form content and marketing systems. Tell me the audience and the goal — replies within the week.",
    marquee: [
      "SHORT-FORM · SYSTEMS · SIMPLE",
      "BATCH THE WORK · SHIP THE REPS",
      "POSITIONING BEFORE PROMOTION",
      "EDUCATION ONLY — RESULTS VARY",
    ],
    milestones: [
      { year: "2026", text: "Launched The Rush on UPLY — short-form content and marketing systems, taught together." },
    ],
    stats: [
      { k: "Brand", v: "Rush Impact Media" },
      { k: "Teaching", v: "Short-form · systems" },
      { k: "Studying at", v: "Rutgers–New Brunswick" },
      { k: "Based in", v: "Edison, NJ" },
    ],
    featuredPostSlug: "batch-a-week-of-content-in-an-hour",
    posts: [
      {
        slug: "batch-a-week-of-content-in-an-hour",
        title: "Batch a week of content in an hour",
        excerpt:
          "The reason most creators fall off isn't talent — it's context-switching. Aarush on the batching workflow he teaches inside The Rush.",
        readTime: "5 min read",
        publishedAt: "2026-07-10",
        tag: "Content",
        body:
          "The reason most creators quit isn't that they run out of ideas. It's that every idea costs them a full afternoon — because they treat every post like a new project. New setup, new lighting, new outfit, new mental gear. Do that seven days in a row and you're not making content anymore, you're just tired.\n\n" +
          "Batching fixes that. The idea is boring on purpose: do all the same-type work at the same time, so the setup cost gets paid once instead of seven times. Here's the exact rhythm I teach inside The Rush.\n\n" +
          "Start with a list, not a camera. Sit down with a notebook or a doc and write ten hooks. Not scripts — hooks. Ten single sentences that would make you stop scrolling if you saw them in your own feed. Some will be terrible. That's the job. You're not filming yet, and it's the cheapest place to be wrong.\n\n" +
          "Now pick the best five. Under each one, write two lines: the point you're actually making, and the ask at the end. That's it. No teleprompter script, no beat-by-beat outline. If a hook needs three paragraphs of setup to make sense, cut it — it wasn't a hook, it was a lecture.\n\n" +
          "Then, in one sitting, film all five. Same lighting, same outfit, same energy — batch. Between takes, don't scroll. Reset, breathe, do the next one. The first take of the day will feel stiff and the fourth will feel natural, which is exactly why batching works: your first take of every day used to be your only take.\n\n" +
          "Edit in one pass, on a different day. Editing is a different brain than performing, and switching between them is where hours vanish. Give editing its own block. Cut tight, caption clearly, and schedule out.\n\n" +
          "That's a week of content in roughly an hour of camera time and a second hour of edit time. Not because you're a genius — because you stopped paying the setup tax five times in a row.\n\n" +
          "If you want the templates I use — hook lists, the two-line post plan, and the batching checklist — they live inside The Rush community. Join at /aarush/community and start shipping the reps instead of chasing the perfect one.\n\n" +
          "Educational content only — marketing results vary based on your product, market, and consistency.",
      },
      {
        slug: "evergreen-beats-viral",
        title: "Why evergreen beats viral (almost every time)",
        excerpt:
          "Viral is a lottery ticket. Evergreen is a business. Aarush on why the boring middle of the content spectrum is where creators actually win.",
        readTime: "4 min read",
        publishedAt: "2026-07-08",
        tag: "Growth",
        body:
          "Every creator I meet wants a viral hit. Almost none of them want an evergreen library. That order is backwards, and it's why so many talented people have a highlight reel but not a business.\n\n" +
          "Here's the honest split. Viral content chases the algorithm's mood on a specific day. When it hits, the spike feels amazing, and within a week the numbers are back to baseline and you're expected to do it again. Evergreen content answers a question people ask this week, and next week, and next year. It doesn't spike. It compounds.\n\n" +
          "Think about the last five things you googled. They were almost certainly evergreen questions — how to do a thing, what a thing means, whether a thing is worth it. Now think about the last viral video you actually remember from six months ago. Hard, right? That's the whole argument. Viral is entertainment; evergreen is search results, saves, and referrals — the surfaces that keep working for you while you sleep.\n\n" +
          "The mistake most creators make is treating these as opposite personalities. They're not. The best content diet I've found is roughly this: most of your posts should answer a real question a real person types into a real search bar, packaged in a format that also works on a scroll feed. A small slice can chase the moment — trends, reactions, timely takes — because those posts introduce you to new people. The evergreen library is what convinces those new people to stay.\n\n" +
          "So the practical move: for every trend-chasing post you publish, publish two that answer a specific question in your niche in the plainest language you can manage. Title it like a search result, hook it like a scroll-stop, and end it with the one thing you want the viewer to do next. Do that for a year and you won't have a viral moment. You'll have a compounding asset, which is quietly the better outcome.\n\n" +
          "Inside The Rush, this is exactly how we plan calendars — trend posts sprinkled on top of an evergreen backbone. Join at /aarush/community if you want the templates and the weekly planning session.\n\n" +
          "Educational content only — marketing outcomes depend on your niche, product, and consistency.",
      },
      {
        slug: "building-a-personal-brand-in-college",
        title: "Building a personal brand in college (without becoming that guy)",
        excerpt:
          "Personal brand isn't a costume. Aarush on how to build a real one while you're still in school — without turning into a walking pitch deck.",
        readTime: "4 min read",
        publishedAt: "2026-07-06",
        tag: "Community",
        body:
          "There's a version of 'personal brand' that everyone rightly hates: the college kid on LinkedIn who describes a group project like it was a Series B raise. Please don't be that. But there's a much better version that most students never build, because they think building a brand means talking about themselves. It doesn't. It means putting the work in public.\n\n" +
          "Here's how I'd think about it if I were starting from scratch, still in school, no audience, no résumé bullet points to lean on.\n\n" +
          "Pick one thing you're already spending time on for reasons other than the internet. A subject you actually study. A skill you're actively getting better at. A community you're already part of. The whole trick is that your brand isn't a topic you invent — it's the topic your life is already about. If you have to force it in week one, it will die by week four.\n\n" +
          "Now publish what you learn, weekly, in public. Not 'thought-leader' posts. Notes. What you tried, what worked, what didn't, what you'd do differently. The point isn't to look smart; the point is to be useful to the version of you from six months ago. Do that consistently and something quietly powerful happens: strangers who care about the same thing start showing up. Some of them are further ahead and will mentor you almost by accident. Some are a step behind and will introduce you to opportunities you'd never find through the campus career portal. You are, in the most literal sense, building your professional network by teaching what you're actively learning.\n\n" +
          "A few honest rules while you're doing it. Don't fake results — writing 'here's what I tried and I don't know yet' is more credible than any polished win story. Don't pitch anything for the first six months; you're building trust, not converting a funnel. And keep the volume sane — one thoughtful post a week beats seven thin ones, every single time.\n\n" +
          "Personal brand in college isn't a costume. It's a paper trail of your actual thinking, published in public, where the right people can find it. Do that for two years and you'll graduate with something most students spend the next decade trying to build: a real reputation with real proof.\n\n" +
          "If you want a small community of creators and students doing exactly this, The Rush is the room. Join at /aarush/community.\n\n" +
          "Educational content only — results vary based on your niche, effort, and consistency.",
      },
    ],
    community: {
      // [Aarush: confirm name] — derived from Rush Impact Media.
      name: "The Rush",
      description:
        "A community for creators and small brands learning to grow with short-form content and smart marketing systems. Weekly planning, batching workflows, hook writing, and honest feedback on the reps. Education only — marketing outcomes vary based on your niche, product, and consistency.",
      membersLabel: "Founding members — now enrolling",
      perks: [
        "Weekly short-form planning session",
        "Batching workflow and hook-writing templates",
        "Content-calendar template (evergreen + trending mix)",
        "Simple analytics reviews — the numbers that actually matter",
        "Monthly live Q&A with Aarush",
        "Members-only feed with #content, #growth, and #wins",
      ],
      // Placeholder pending [Aarush: confirm launch price].
      priceUsd: 0,
    },
    courses: [
      {
        slug: "short-form-content-engine",
        title: "Short-Form Content Engine",
        level: "Beginner",
        lessons: 7,
        duration: "[TBC]",
        priceUsd: 0, // Placeholder pending [Aarush: confirm price].
        summary:
          "A step-by-step system for finding your pillars, batching a week of content in an hour, writing hooks that stop the scroll, and reading your analytics without fooling yourself. Educational content only — results vary.",
        outline: [
          "Finding your content pillars",
          "The batching workflow: record a week in an hour",
          "Hooks that stop the scroll",
          "Before/after and myth-vs-fact formats",
          "Editing for retention",
          "Posting cadence and consistency",
          "Reading your analytics without fooling yourself",
        ],
      },
      {
        slug: "marketing-systems-101",
        title: "Marketing Systems 101",
        level: "Beginner",
        lessons: 6,
        duration: "[TBC]",
        priceUsd: 0, // Placeholder pending [Aarush: confirm price].
        summary:
          "The simple systems side of marketing for creators and small brands: positioning, a content calendar you'll actually keep, evergreen vs trending, email capture, offers, and measuring what actually converts. Education only — outcomes depend on your product and market.",
        outline: [
          "Positioning before promotion",
          "Building a simple content calendar",
          "Evergreen vs trending content",
          "Turning followers into email subscribers",
          "Basic offers and landing pages",
          "Measuring what actually converts",
        ],
      },
    ],
    disclaimers: [
      "Educational content only — marketing outcomes depend on your product, market, and consistency. No income or growth results are guaranteed.",
    ],
  },

];





const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats a roster `joinedAt` ISO date as an "Est. <Mon YYYY>" label
 * for creator cards (e.g. "2025-03-15" → "Est. Mar 2025").
 * Returns null when the date is missing or unparsable so cards can hide it.
 */
export function formatEstablished(joinedAt?: string): string | null {
  if (!joinedAt) return null;
  const m = /^(\d{4})-(\d{2})/.exec(joinedAt);
  if (!m) return null;
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return `Est. ${MONTHS[monthIdx]} ${m[1]}`;
}

export function findArtistBySlug(slug: string | undefined | null): ArtistRosterEntry | null {
  if (!slug) return null;
  const s = slug.toLowerCase().replace(/^\/+|\/+$/g, "").replace(/-site$/, "");
  return (
    ARTIST_ROSTER.find(
      (a) => a.slug === s || (a.aliases ?? []).some((al) => al.toLowerCase() === s),
    ) ?? null
  );
}
