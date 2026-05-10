import { useRef } from 'react';

export default function MuxAudioUploader({
  onPick,
  fileName,
  progress,
}: {
  onPick: (f: File | null) => void;
  fileName?: string | null;
  progress?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full px-4 py-6 rounded-xl border border-dashed border-white/20 text-white text-sm"
      >
        {fileName ? `🎵 ${fileName}` : 'Choose audio file'}
      </button>
      {progress != null && progress > 0 && (
        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg,#3D7CFF,#B025FF)',
              transition: 'width 200ms',
            }}
          />
        </div>
      )}
    </div>
  );
}
