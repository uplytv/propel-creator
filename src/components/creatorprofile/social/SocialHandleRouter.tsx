import { Navigate, useParams } from "react-router-dom";
import { findArtistBySlug } from "@/data/artistRoster";
import { normalizeProfileSlugInput } from "@/lib/profileSlug";
import RosterSocialProfilePage from "./RosterSocialProfilePage";
import SocialCreatorPage from "./SocialCreatorPage";

const TAJ_HANDLES = new Set(["taj", "taj-fencing", "tajfencing", "taj_fencing", "taj.fencing"]);

/**
 * Resolves /@<handle>:
 *   1. If the handle matches a roster artist (slug or alias) → render the
 *      roster-backed profile (no DB required).
 *   2. Otherwise → fall through to the DB-backed SocialCreatorPage.
 */
export default function SocialHandleRouter() {
  const { slug: rawSlug } = useParams<{ slug?: string }>();
  const slug = normalizeProfileSlugInput(rawSlug);
  if (TAJ_HANDLES.has(slug.toLowerCase())) return <Navigate to="/taj" replace />;
  const artist = findArtistBySlug(slug);
  if (artist) return <RosterSocialProfilePage artist={artist} />;
  return <SocialCreatorPage />;
}
