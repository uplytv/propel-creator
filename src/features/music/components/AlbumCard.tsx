import { Link } from 'react-router-dom';
import type { Album } from '../types';

export default function AlbumCard({ album }: { album: Album }) {
  return (
    <Link to={`/music/album/${album.id}`} className="block w-40 sm:w-44 flex-shrink-0">
      <div
        className="aspect-square rounded-xl"
        style={{
          background: album.cover_art_url
            ? `url(${album.cover_art_url}) center/cover`
            : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
        }}
      />
      <div className="mt-2 text-sm font-semibold text-white truncate">{album.title}</div>
      <div className="text-xs text-white/50 capitalize">{album.album_type}</div>
    </Link>
  );
}
