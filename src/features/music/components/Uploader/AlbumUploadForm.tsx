// Album upload — minimal MVP. Composes TrackUploadForm flow per-track.
import TrackUploadForm from './TrackUploadForm';

export default function AlbumUploadForm() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/60">
        Upload tracks one by one — they'll appear in your library. Album grouping coming soon.
      </p>
      <TrackUploadForm />
    </div>
  );
}
