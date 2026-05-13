import SocialCreatorPage from "@/components/creatorprofile/social/SocialCreatorPage";

/**
 * Thin alias kept so deep imports from elsewhere keep working.
 * The actual rendering for /@:slug now lives in SocialCreatorPage,
 * which routes musicians into the legacy ArtistPageContent under the
 * "Music" tab while everyone else gets the unified social profile.
 */
export default function PublicArtistPage() {
  return <SocialCreatorPage />;
}
