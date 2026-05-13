import { lazy, Suspense } from "react";
import CreatorHero from "./CreatorHero";
import WeeklyPlansStrip from "./WeeklyPlansStrip";
import UpcomingEventsStrip from "./UpcomingEventsStrip";
import CreatorWorksGrid from "./CreatorWorksGrid";
import EpisodeFeed from "./EpisodeFeed";

const ArtistPageContent = lazy(
  () => import("@/features/music/components/ArtistPage/ArtistPageContent"),
);
const DJSetsSection = lazy(
  () => import("@/features/music/components/ArtistPage/DJSetsSection"),
);

export type CreatorType =
  | "musician"
  | "visual_artist"
  | "content_creator"
  | "filmmaker"
  | "podcaster"
  | "dj_producer"
  | "generic";

interface BasicProfile {
  id: string;
  user_id?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface ArtistProfile {
  user_id: string;
  hero_image_url?: string | null;
  hero_logo_url?: string | null;
  tagline?: string | null;
  page_theme?: Record<string, any> | null;
  [k: string]: any;
}

interface Props {
  creatorType: CreatorType | string | null | undefined;
  basicProfile: BasicProfile;
  artistProfile?: ArtistProfile | null;
  mode?: "public" | "app";
}

export default function CreatorLandingRenderer({
  creatorType,
  basicProfile,
  artistProfile,
  mode = "public",
}: Props) {
  const type = (creatorType || "generic") as CreatorType;
  const displayName = basicProfile.display_name || basicProfile.username || "Creator";
  const userId = basicProfile.user_id || basicProfile.id;
  const profileId = basicProfile.id;

  // Musician: pixel-identical to existing artist page experience.
  if (type === "musician" && artistProfile) {
    return (
      <Suspense fallback={<div className="min-h-screen" style={{ background: "#0A0E27" }} />}>
        <ArtistPageContent
          userId={artistProfile.user_id}
          profile={artistProfile}
          basicProfile={basicProfile}
          mode={mode}
        />
      </Suspense>
    );
  }

  // Shared chrome for all non-musician layouts
  const Header = (
    <CreatorHero
      displayName={displayName}
      tagline={artistProfile?.tagline || null}
      heroImageUrl={artistProfile?.hero_image_url || null}
      heroLogoUrl={artistProfile?.hero_logo_url || null}
      avatarUrl={basicProfile.avatar_url || null}
    />
  );

  const SharedStrips = (
    <>
      <WeeklyPlansStrip creatorUserId={userId} />
      <UpcomingEventsStrip creatorUserId={userId} />
    </>
  );

  switch (type) {
    case "visual_artist":
      return (
        <main className="min-h-screen bg-background text-foreground">
          {Header}
          <CreatorWorksGrid
            creatorProfileId={profileId}
            workTypes={["artwork", "photo"]}
            title="Portfolio"
            layout="grid"
            emptyMessage="No works published yet."
          />
          {SharedStrips}
        </main>
      );

    case "content_creator":
      return (
        <main className="min-h-screen bg-background text-foreground">
          {Header}
          <CreatorWorksGrid
            creatorProfileId={profileId}
            workTypes={["video"]}
            title="Videos"
            layout="feed"
            emptyMessage="No videos yet."
          />
          {SharedStrips}
        </main>
      );

    case "filmmaker":
      return (
        <main className="min-h-screen bg-background text-foreground">
          {Header}
          <CreatorWorksGrid
            creatorProfileId={profileId}
            workTypes={["film", "video"]}
            title="Films"
            layout="feed"
            emptyMessage="No films published yet."
          />
          {SharedStrips}
        </main>
      );

    case "podcaster":
      return (
        <main className="min-h-screen bg-background text-foreground">
          {Header}
          <EpisodeFeed creatorUserId={userId} />
          {SharedStrips}
        </main>
      );

    case "dj_producer":
      return (
        <main className="min-h-screen bg-background text-foreground">
          {Header}
          <Suspense fallback={null}>
            <div className="max-w-[1200px] mx-auto px-6 py-8">
              <DJSetsSection userId={userId} mode={mode} />
            </div>
          </Suspense>
          <CreatorWorksGrid
            creatorProfileId={profileId}
            workTypes={["mix"]}
            title="More mixes"
            layout="grid"
          />
          {SharedStrips}
        </main>
      );

    case "generic":
    default:
      return (
        <main className="min-h-screen bg-background text-foreground">
          {Header}
          <CreatorWorksGrid
            creatorProfileId={profileId}
            workTypes={["artwork", "video", "film", "episode", "mix", "photo", "other"]}
            title="Work"
            layout="grid"
          />
          {SharedStrips}
        </main>
      );
  }
}
