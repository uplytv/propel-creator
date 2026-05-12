import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GENRES } from '../../lib/genres';
import { uploadCoverArt } from '../../lib/musicQueries';
import { useUploadTrack } from '../../hooks/useUploadTrack';
import CoverArtPicker from './CoverArtPicker';
import MuxAudioUploader from './MuxAudioUploader';

export default function TrackUploadForm({
  onAriaPrompt,
}: {
  onAriaPrompt?: (prompt: string) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<string>('Hip-Hop');
  const [category, setCategory] = useState<string>('song');
  const [description, setDescription] = useState('');
  const [explicit, setExplicit] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const { upload, retry, cancel, uploading, progress, error, errorPhase, stage, canRetry } =
    useUploadTrack();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error('Sign in to upload');
      return;
    }
    if (!title || !audio) {
      toast.error('Title and audio file are required');
      return;
    }
    let coverUrl: string | null = null;
    if (cover) coverUrl = await uploadCoverArt(user.id, cover);
    const trackId = await upload({
      title,
      genre,
      category,
      is_explicit: explicit,
      description,
      cover_art_url: coverUrl,
      file: audio,
    });
    if (trackId) {
      toast.success("Processing… we'll email you when it's live");
      navigate('/music/library');
    }
    // On failure, the inline error UI in MuxAudioUploader handles retry.
  }

  async function handleRetry() {
    const trackId = await retry();
    if (trackId) {
      toast.success("Processing… we'll email you when it's live");
      navigate('/music/library');
    }
  }

  const ariaButtons = [
    'Suggest a title for my track based on the genre and vibe.',
    'Write a short description for this track.',
    'Suggest 5 uply playlists this track would fit on.',
  ];

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-4 items-start">
        <CoverArtPicker onPick={setCover} />
        <div className="flex-1 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Track title"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40"
            style={{ fontSize: 16 }}
          />
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
            style={{ fontSize: 16 }}
          >
            {GENRES.map((g) => (
              <option key={g} value={g} className="bg-[#0A0A0A]">
                {g}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={explicit}
              onChange={(e) => setExplicit(e.target.checked)}
            />
            Explicit
          </label>
        </div>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40"
        style={{ fontSize: 16 }}
      />

      <MuxAudioUploader
        onPick={setAudio}
        fileName={audio?.name}
        progress={progress}
        stage={stage}
        error={error}
        errorPhase={errorPhase}
        onRetry={canRetry ? handleRetry : undefined}
        onCancel={uploading ? cancel : undefined}
      />

      {onAriaPrompt && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-white/50 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Ask ARIA
          </div>
          <div className="flex flex-wrap gap-2">
            {ariaButtons.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onAriaPrompt(p)}
                className="px-3 py-1.5 rounded-full text-xs border border-white/15 text-white/80 hover:bg-white/5"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="w-full py-3 rounded-full text-white font-bold disabled:opacity-50"
        style={{ background: 'linear-gradient(90deg,#3D7CFF,#B025FF)' }}
      >
        {uploading ? `Uploading… ${progress}%` : 'Upload track'}
      </button>
    </form>
  );
}
