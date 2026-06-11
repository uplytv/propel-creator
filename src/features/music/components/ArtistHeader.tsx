import { BadgeCheck, Globe, Instagram, Twitter, Music2 } from "lucide-react";
import { ArtistProfile } from "../hooks/useArtistProfile";
import StartStationButton from "./StartStationButton";

interface Props {
  profile: ArtistProfile | null;
  displayName: string;
  username?: string;
  monthlyListeners: number;
}

export default function ArtistHeader({ profile, displayName, username, monthlyListeners }: Props) {
  const links = profile?.social_links ?? {};

  return (
    <div className="relative -mx-4 mb-6 overflow-hidden rounded-b-3xl">
      <div
        className="h-48 sm:h-64 w-full bg-gradient-to-br from-primary/30 to-black"
        style={
          profile?.header_image_url
            ? {
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2)), url(${profile.header_image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white">{displayName}</h1>
          {profile?.is_verified && (
            <BadgeCheck className="w-6 h-6" style={{ color: "#3D7CFF" }} aria-label="Verified artist" />
          )}
        </div>
        {username && <p className="text-white/50 text-sm">@{username}</p>}
        <p className="text-white/70 text-sm mt-1">
          <span className="font-semibold text-white">{monthlyListeners.toLocaleString()}</span> monthly listeners
        </p>
        {profile?.artist_bio && (
          <p className="text-white/60 text-xs mt-2 line-clamp-2">{profile.artist_bio}</p>
        )}
        {profile?.user_id && (
          <div className="mt-3">
            <StartStationButton
              variant="pill"
              seed={{ seedType: 'artist', seedId: profile.user_id, seedName: displayName }}
            />
          </div>
        )}
        {(links.website || links.instagram || links.twitter || links.spotify) && (
          <div className="flex items-center gap-3 mt-3">
            {links.website && (
              <a href={links.website} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">
                <Globe className="w-4 h-4" />
              </a>
            )}
            {links.instagram && (
              <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {links.twitter && (
              <a href={links.twitter} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {links.spotify && (
              <a href={links.spotify} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white">
                <Music2 className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
