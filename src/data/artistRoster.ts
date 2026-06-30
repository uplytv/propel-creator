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
}

export interface ArtistCommunity {
  name: string;
  description: string;
  membersLabel: string;
  perks: string[];
  /** Monthly USD; 0 = free */
  priceUsd: number;
}

export interface ArtistCourse {
  slug: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "All Levels";
  lessons: number;
  duration: string;
  priceUsd: number;
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
  searchKeywords: string[];
  verified?: boolean;
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
  /** Blog posts surfaced at /:slug/blog */
  posts?: ArtistBlogPost[];
  /** Slug of a blog post to feature on the editorial site. */
  featuredPostSlug?: string;
  /** Community offering surfaced at /:slug/community */
  community?: ArtistCommunity;
  /** Courses offered at /:slug/courses */
  courses?: ArtistCourse[];
  /** Override the section chips shown on the /roster hub card (defaults derive from posts/community/courses). */
  sectionsOverride?: string[];
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
        slug: "persian-vocal-foundations",
        title: "Persian Vocal Foundations",
        level: "Beginner",
        lessons: 12,
        duration: "3h 40m",
        priceUsd: 79,
        summary: "OMID walks through the breathing, phrasing, and ornamentation that define classical Persian pop vocals.",
        outline: [
          "Breath support & posture",
          "Vowel placement in Farsi lyrics",
          "Tahrir basics — when and when not",
          "Phrasing romantic ballads",
          "Recording vocals at home",
        ],
      },
    ],
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
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@morvaridshahbazi · 59K followers", href: "https://www.instagram.com/morvaridshahbazi", handle: "morvaridshahbazi" },
      { kind: "spotify", label: "Spotify", sub: "Listen on Spotify", href: "https://open.spotify.com/artist/5QFbUVTpgjwACp" },
      { kind: "youtube", label: "YouTube", sub: "Performances & music videos", href: "https://www.youtube.com/results?search_query=morvarid+shahbazi" },
      { kind: "threads", label: "Threads", sub: "@morvaridshahbazi", href: "https://www.threads.net/@morvaridshahbazi" },
      { kind: "facebook", label: "Facebook", sub: "Morvarid Shahbazi", href: "https://www.facebook.com/morvaridshahbazi" },
    ],
    videos: [
      { title: "Latest reels", instagramUrl: "https://www.instagram.com/morvaridshahbazi/" },
    ],
    searchKeywords: ["morvarid", "morvaird", "morvard", "morwarid", "morvarid shahbazi", "morvaridshahbazi", "pearl of persia", "persian dancer", "persian singer", "morvarid production"],
    verified: false,
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
    accent: "#C9A84C",
    portraitUrl: "/__l5e/assets-v1/ecb368e0-99ff-410b-bc3f-f36978159574/arya-xo-portrait-v3.jpg",
    socials: [
      { kind: "instagram", label: "Instagram", sub: "@aryaxo", href: "https://www.instagram.com/aryaxo", handle: "aryaxo" },
      { kind: "spotify", label: "Spotify", sub: "Stream the catalogue", href: "https://open.spotify.com/search/Arya%20XO" },
      { kind: "youtube", label: "YouTube", sub: "Official videos", href: "https://www.youtube.com/results?search_query=arya+xo" },
    ],
    searchKeywords: ["arya", "arya xo", "aryaxo", "150 bands", "get down", "bay area rap"],
    verified: true,
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

];


export function findArtistBySlug(slug: string | undefined | null): ArtistRosterEntry | null {
  if (!slug) return null;
  const s = slug.toLowerCase().replace(/^\/+|\/+$/g, "").replace(/-site$/, "");
  return (
    ARTIST_ROSTER.find(
      (a) => a.slug === s || (a.aliases ?? []).some((al) => al.toLowerCase() === s),
    ) ?? null
  );
}
