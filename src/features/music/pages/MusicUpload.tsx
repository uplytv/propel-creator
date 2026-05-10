import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AriaPanel } from '@/components/aria/AriaPanel';
import TrackUploadForm from '../components/Uploader/TrackUploadForm';
import AlbumUploadForm from '../components/Uploader/AlbumUploadForm';

export default function MusicUpload() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'track' | 'album'>('track');
  const [ariaOpen, setAriaOpen] = useState(false);
  const [ariaSeed, setAriaSeed] = useState<string | null>(null);

  if (loading) return null;
  if (!user) return <Navigate to="/auth?returnTo=/music/upload" replace />;

  const promptAria = (p: string) => {
    setAriaSeed(p);
    setAriaOpen(true);
  };

  return (
    <div className="pb-40 max-w-2xl mx-auto px-4 pt-4">
      <Link to="/music" className="inline-flex items-center gap-1 text-white/60 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Music
      </Link>

      <h1 className="text-2xl font-black text-white mb-1">your first track is one upload away</h1>
      <p className="text-sm text-white/50 mb-6">audio goes to uply, processed in the background.</p>

      <div className="flex gap-2 mb-6 p-1 rounded-full bg-white/5 w-fit">
        {(['track', 'album'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize font-semibold ${
              tab === t ? 'text-white' : 'text-white/50'
            }`}
            style={
              tab === t ? { background: 'linear-gradient(90deg,#3D7CFF,#B025FF)' } : undefined
            }
          >
            {t === 'track' ? 'Single Track' : 'Album'}
          </button>
        ))}
      </div>

      {tab === 'track' ? (
        <TrackUploadForm onAriaPrompt={promptAria} />
      ) : (
        <AlbumUploadForm />
      )}

      <AriaPanel open={ariaOpen} onClose={() => setAriaOpen(false)} key={ariaSeed} />
    </div>
  );
}
