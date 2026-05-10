import { useRef, useState } from 'react';

export default function CoverArtPicker({
  onPick,
  previewUrl,
}: {
  onPick: (file: File | null) => void;
  previewUrl?: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(previewUrl ?? null);

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onPick(f);
          if (f) setPreview(URL.createObjectURL(f));
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-32 h-32 rounded-xl flex items-center justify-center text-white text-xs"
        style={{
          background: preview
            ? `url(${preview}) center/cover`
            : 'linear-gradient(135deg,#3D7CFF,#B025FF)',
        }}
      >
        {!preview && 'Cover art'}
      </button>
    </div>
  );
}
