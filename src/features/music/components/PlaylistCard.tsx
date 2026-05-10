import { Link } from 'react-router-dom';
import type { MusicPlaylist } from '../types';

export default function PlaylistCard({ playlist }: { playlist: MusicPlaylist }) {
  return (
    <Link to={`/music/playlist/${playlist.id}`} className="block w-40 sm:w-44 flex-shrink-0">
      <div
        className="aspect-square rounded-xl"
        style={{
          background: playlist.cover_art_url
            ? `url(${playlist.cover_art_url}) center/cover`
            : 'linear-gradient(135deg,#B025FF,#3D7CFF)',
        }}
      />
      <div className="mt-2 text-sm font-semibold text-white truncate">{playlist.title}</div>
      <div className="text-xs text-white/50">Playlist</div>
    </Link>
  );
}
