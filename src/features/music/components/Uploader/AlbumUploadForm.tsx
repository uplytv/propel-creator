import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GENRES } from '../../lib/genres';
import { uploadCoverArt } from '../../lib/musicQueries';
import { useUploadTrack } from '../../hooks/useUploadTrack';
import CoverArtPicker from './CoverArtPicker';
import type { AlbumType } from '../../types';

const sb = supabase as unknown as any;

interface TrackEntry {
  title: string;
  file: File | null;
}

export default function AlbumUploadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { upload } = useUploadTrack();

  const [albumTitle, setAlbumTitle] = useState('');
  const [albumType, setAlbumType] = useState<AlbumType>('album');
  const [genre, setGenre] = useState('Hip-Hop');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [tracks, setTracks] = useState<TrackEntry[]>([{ title: '', file: null }]);
  const [submitting, setSubmitting] = useState(false);
  const [stepProgress, setStepProgress] = useState<{ index: number; pct: number } | null>(null);

  const setTrack = (i: number, patch: Partial<TrackEntry>) =>
    setTracks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const addTrack = () => setTracks((p) => [...p, { title: '', file: null }]);
  const removeTrack = (i: number) =>
    setTracks((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error('Sign in to upload');
    if (!albumTitle.trim()) return toast.error('Album title required');
    const valid = tracks.filter((t) => t.title.trim() && t.file);
    if (!valid.length) return toast.error('Add at least one track with title + audio');

    setSubmitting(true);
    try {
      const coverUrl = cover ? await uploadCoverArt(user.id, cover) : null;

      const { data: album, error: albumErr } = await sb
        .from('albums')
        .insert({
          creator_id: user.id,
          title: albumTitle,
          description: description || null,
          album_type: albumType,
          cover_art_url: coverUrl,
          is_published: true,
          release_date: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single();
      if (albumErr || !album?.id) throw new Error(albumErr?.message || 'Album create failed');

      for (let i = 0; i < valid.length; i++) {
        const t = valid[i];
        setStepProgress({ index: i, pct: 0 });
        const trackId = await upload({
          title: t.title,
          genre,
          file: t.file!,
          cover_art_url: coverUrl,
          onProgress: (pct) => setStepProgress({ index: i, pct }),
        });
        if (!trackId) throw new Error(`Track ${i + 1} upload failed`);
        await sb.from('album_tracks').insert({
          album_id: album.id,
          track_id: trackId,
          track_number: i + 1,
        });
      }

      toast.success('Album uploaded — tracks are processing');
      navigate(`/music/album/${album.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Album upload failed');
    } finally {
      setSubmitting(false);
      setStepProgress(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-4 items-start">
        <CoverArtPicker onPick={setCover} />
        <div className="flex-1 space-y-3">
          <input
            value={albumTitle}
            onChange={(e) => setAlbumTitle(e.target.value)}
            placeholder="Album title"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40"
            style={{ fontSize: 16 }}
          />
          <div className="flex gap-2">
            <select
              value={albumType}
              onChange={(e) => setAlbumType(e.target.value as AlbumType)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
              style={{ fontSize: 16 }}
            >
              <option value="single" className="bg-[#0A0A0A]">Single</option>
              <option value="ep" className="bg-[#0A0A0A]">EP</option>
              <option value="album" className="bg-[#0A0A0A]">Album</option>
            </select>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
              style={{ fontSize: 16 }}
            >
              {GENRES.map((g) => (
                <option key={g} value={g} className="bg-[#0A0A0A]">{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="About this album (optional)"
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40"
        style={{ fontSize: 16 }}
      />

      <div className="space-y-2">
        <div className="text-sm font-semibold text-white">Tracks</div>
        {tracks.map((t, i) => {
          const pct = stepProgress?.index === i ? stepProgress.pct : null;
          return (
            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50 w-6">{i + 1}.</span>
                <input
                  value={t.title}
                  onChange={(e) => setTrack(i, { title: e.target.value })}
                  placeholder={`Track ${i + 1} title`}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40"
                  style={{ fontSize: 16 }}
                />
                <button
                  type="button"
                  onClick={() => removeTrack(i)}
                  disabled={tracks.length === 1}
                  className="p-2 text-white/40 hover:text-red-400 disabled:opacity-30"
                  aria-label="Remove track"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setTrack(i, { file: e.target.files?.[0] ?? null })}
                className="block w-full text-sm text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white"
              />
              {pct !== null && (
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#3D7CFF,#B025FF)' }}
                  />
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={addTrack}
          className="w-full py-2 rounded-xl border border-dashed border-white/20 text-white/70 text-sm flex items-center justify-center gap-1 hover:bg-white/5"
        >
          <Plus className="w-4 h-4" /> Add track
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-full text-white font-bold disabled:opacity-50"
        style={{ background: 'linear-gradient(90deg,#3D7CFF,#B025FF)' }}
      >
        {submitting ? 'Uploading album…' : 'Publish album'}
      </button>
    </form>
  );
}
