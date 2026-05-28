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
import LockTrackEditor, { type LockTrackEditorValue } from '../LockTrackEditor';

const DEFAULT_LOCK: LockTrackEditorValue = {
  is_locked: false,
  unlock_type: null,
  unlock_price_cents: null,
  required_tier_id: null,
  release_status: 'released',
  scheduled_release_at: null,
  preview_start_seconds: 0,
  preview_duration_seconds: 45,
  preview_url: null,
  allow_download: false,
};
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
  const [lock, setLock] = useState<LockTrackEditorValue>(DEFAULT_LOCK);
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
    if (lock.is_locked) {
      if (!lock.unlock_type) {
        toast.error('Pick an unlock method for this locked track');
        return;
      }
      if ((lock.unlock_type === 'purchase' || lock.unlock_type === 'both') && !lock.unlock_price_cents) {
        toast.error('Set an unlock price');
        return;
      }
      if ((lock.unlock_type === 'subscription' || lock.unlock_type === 'both') && !lock.required_tier_id) {
        toast.error('Pick a required tier');
        return;
      }
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
      is_locked: lock.is_locked,
      unlock_type: lock.is_locked ? lock.unlock_type : null,
      unlock_price_cents: lock.is_locked ? lock.unlock_price_cents : null,
      required_tier_id: lock.is_locked ? lock.required_tier_id : null,
      release_status: lock.release_status,
      scheduled_release_at: lock.scheduled_release_at,
      preview_start_seconds: lock.preview_start_seconds,
      preview_duration_seconds: lock.preview_duration_seconds,
      preview_url: lock.preview_url,
      allow_download: lock.allow_download,
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
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
            style={{ fontSize: 16 }}
          >
            <option value="song" className="bg-[#0A0A0A]">Song</option>
            <option value="remix" className="bg-[#0A0A0A]">Remix</option>
            <option value="dj_set" className="bg-[#0A0A0A]">DJ Set</option>
            <option value="live_set" className="bg-[#0A0A0A]">Live Set</option>
            <option value="demo" className="bg-[#0A0A0A]">Demo</option>
            <option value="interlude" className="bg-[#0A0A0A]">Interlude</option>
          </select>
          {(category === 'remix' || category === 'dj_set') && (
            <p className="text-xs text-white/50">
              {category === 'remix'
                ? 'Remixes appear in your artist page’s Remixes section'
                : 'DJ sets appear in your artist page’s DJ Sets section'}
            </p>
          )}
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
