import { useRef } from 'react';
import { AlertCircle, RotateCw, X, Loader2, CheckCircle2 } from 'lucide-react';
import type { UploadStage, UploadErrorPhase } from '../../hooks/useUploadTrack';

export default function MuxAudioUploader({
  onPick,
  fileName,
  progress,
  stage = 'idle',
  error,
  errorPhase,
  onRetry,
  onCancel,
}: {
  onPick: (f: File | null) => void;
  fileName?: string | null;
  progress?: number;
  stage?: UploadStage;
  error?: string | null;
  errorPhase?: UploadErrorPhase;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isInitializing = stage === 'initializing';
  const isUploading = stage === 'uploading';
  const isError = stage === 'error';
  const isSuccess = stage === 'success';
  const busy = isInitializing || isUploading;

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
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="w-full px-4 py-6 rounded-xl border border-dashed border-white/20 text-white text-sm disabled:opacity-60"
      >
        {fileName ? `🎵 ${fileName}` : 'Choose audio file'}
      </button>

      {isInitializing && (
        <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Preparing upload with Mux…
        </div>
      )}

      {isUploading && progress != null && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>Uploading… {progress}%</span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 text-white/60 hover:text-white"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            )}
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg,#3D7CFF,#B025FF)',
                transition: 'width 200ms',
              }}
            />
          </div>
        </div>
      )}

      {isSuccess && (
        <div className="mt-3 flex items-center gap-2 text-xs text-primary">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Upload complete. Mux is processing your track.
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="mt-3 p-3 rounded-xl border border-red-500/40 bg-red-500/10 space-y-2"
        >
          <div className="flex items-start gap-2 text-sm text-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">
                {errorPhase === 'init'
                  ? "Couldn't start the upload"
                  : 'Upload was interrupted'}
              </div>
              <div className="text-xs text-red-200/80 mt-0.5 break-words">
                {error ||
                  (errorPhase === 'init'
                    ? "We couldn't reach Mux to start your upload."
                    : 'The audio transfer to Mux failed.')}
              </div>
              <div className="text-xs text-white/50 mt-1">
                Tip: check your connection
                {errorPhase === 'upload' ? ', keep this tab open, ' : ' '}
                and try again.
              </div>
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Retry upload
            </button>
          )}
        </div>
      )}
    </div>
  );
}
