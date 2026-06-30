/**
 * Artist Roster — single source of truth for hand-curated artist pages
 * that don't (yet) live in the DB. Add an entry here and the artist
 * automatically gets:
 *   • A link-in-bio page at /:slug          (e.g. /omid)
 *   • A full editorial site at /:slug-site  (e.g. /omid-site)
 *   • Curated search results on UPLY
 *
 * Routes are registered in App.tsx via ARTIST_ROSTER (loop).
 * Curated search is wired in src/lib/curatedSearch.ts.
 *
 * Designed to be the seamless, automated path so new artists can be
 * onboarded in <60s by appending a single object below.
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
  /** YouTube video ID OR full embeddable url */
  youtubeId?: string;
  /** Embeddable Instagram /reel/ or /tv/ URL */
  instagramUrl?: string;
  title: string;
  caption?: string;
}

export interface ArtistRosterEntry {
  /** URL slug — page lives at /:slug and /:slug-site */
  slug: string;
  /** Additional URL aliases that should resolve to the same artist */
  aliases?: string[];
  displayName: string;
  /** Short eyebrow shown above the name */
  eyebrow: string;
  tagline: string;
  /** Multi-paragraph editorial bio (markdown-ish plain text, \n\n = paragraph) */
  bio: string;
  /** Hero gradient — two HSL/hex colors */
  gradient: { from: string; to: string };
  /** Accent color used for buttons / hairlines */
  accent: string;
  /** Optional hero portrait (CDN url). If omitted we render a typographic hero. */
  portraitUrl?: string;
  socials: ArtistSocial[];
  videos?: ArtistVideo[];
  spotifyArtistEmbedId?: string;
  /** Curated keywords for global search */
  searchKeywords: string[];
  /** Show verified-artist badge */
  verified?: boolean;
  /** Optional booking inquiry email */
  bookingEmail?: string;
  /** Optional location string (e.g. "Los Angeles · Tehran") */
  location?: string;
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
    searchKeywords: ["morvarid", "morvarid shahbazi", "morvaridshahbazi", "pearl of persia", "persian dancer", "persian singer", "morvarid production"],
    verified: false,
    location: "Los Angeles",
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
