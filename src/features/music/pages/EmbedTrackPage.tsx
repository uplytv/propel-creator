import { useParams } from 'react-router-dom';
import EmbedPlayer from '../components/EmbedPlayer';

export default function EmbedTrackPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <EmbedPlayer trackId={id} />
    </div>
  );
}
