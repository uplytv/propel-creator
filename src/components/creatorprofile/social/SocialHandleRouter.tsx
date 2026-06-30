import { useParams } from "react-router-dom";
import { findArtistBySlug } from "@/data/artistRoster";
import { normalizeProfileSlugInput } from "@/lib/profileSlug";
import RosterSocialProfilePage from "./RosterSocialProfilePage";
import SocialCreatorPage from "./SocialCreatorPage";

/**
 * Resolves /@<handle>:
 *   1. If the handle matches a roster artist (slug or alias) → render the
 *      roster-backed profile (no DB required).
 *   2. Otherwise → fall through to the DB-backed SocialCreatorPage.
 */
export default function SocialHandleRouter() {
  const { slug: rawSlug } = useParams<{ slug?: string }>();
  const slug = normalizeProfileSlugInput(rawSlug);
  const artist = findArtistBySlug(slug);
  if (artist) return <RosterSocialProfilePage artist={artist} />;
  return <SocialCreatorPage />;
}
