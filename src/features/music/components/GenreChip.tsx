import { Link } from 'react-router-dom';

export default function GenreChip({ genre }: { genre: string }) {
  return (
    <Link
      to={`/music/genre/${encodeURIComponent(genre)}`}
      className="px-4 py-2 rounded-full text-sm font-semibold text-white whitespace-nowrap"
      style={{ background: 'linear-gradient(135deg,#3D7CFF,#B025FF)' }}
    >
      {genre}
    </Link>
  );
}
