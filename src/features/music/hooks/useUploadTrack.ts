import { useRef, useState, useCallback } from 'react';
import * as UpChunk from '@mux/upchunk';
import { supabase } from '@/integrations/supabase/client';

interface InitResp {
  trackId: string;
  uploadUrl: string;
  uploadId: string;
}

export type UploadStage = 'idle' | 'initializing' | 'uploading' | 'success' | 'error';
export type UploadErrorPhase = 'init' | 'upload' | null;

export interface LockFields {
  is_locked?: boolean;
  unlock_type?: 'purchase' | 'subscription' | 'both' | null;
  unlock_price_cents?: number | null;
  required_tier_id?: string | null;
  release_status?: 'released' | 'unreleased';
  scheduled_release_at?: string | null;
  preview_start_seconds?: number | null;
  preview_duration_seconds?: number | null;
  preview_url?: string | null;
  allow_download?: boolean;
}

export interface UploadOptions extends LockFields {
  title: string;
  genre?: string | null;
  is_explicit?: boolean;
  description?: string | null;
  cover_art_url?: string | null;
  category?: string | null;
  file: File;
  onProgress?: (pct: number) => void;
}

export function useUploadTrack() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [errorPhase, setErrorPhase] = useState<UploadErrorPhase>(null);
  const lastOptsRef = useRef<UploadOptions | null>(null);
  const activeUploadRef = useRef<any>(null);

  const reset = useCallback(() => {
    setProgress(0);
    setStage('idle');
    setError(null);
    setErrorPhase(null);
  }, []);

  const cancel = useCallback(() => {
    try {
      activeUploadRef.current?.abort?.();
    } catch {}
    activeUploadRef.current = null;
    setUploading(false);
    setStage('idle');
  }, []);

  const upload = useCallback(async (opts: UploadOptions): Promise<string | null> => {
    lastOptsRef.current = opts;
    setUploading(true);
    setProgress(0);
    setError(null);
    setErrorPhase(null);
    setStage('initializing');

    let init: InitResp;
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('music-upload-init', {
        body: {
          title: opts.title,
          genre: opts.genre ?? null,
          is_explicit: !!opts.is_explicit,
        },
      });
      if (fnErr || !data) {
        throw new Error(
          fnErr?.message ||
            "Couldn't reach the upload service. Check your connection and try again."
        );
      }
      init = data as InitResp;
    } catch (e: any) {
      setError(e?.message || 'Failed to initialize upload with Mux.');
      setErrorPhase('init');
      setStage('error');
      setUploading(false);
      return null;
    }

    // Persist optional metadata directly (RLS: owner-only). Non-fatal if it fails.
    try {
      const sb = supabase as unknown as any;
      const patch: Record<string, any> = {};
      if (opts.description) patch.description = opts.description;
      if (opts.cover_art_url) patch.cover_art_url = opts.cover_art_url;
      if (opts.category) patch.category = opts.category;
      if (Object.keys(patch).length) {
        await sb.from('tracks').update(patch).eq('id', init.trackId);
      }
    } catch {
      // ignore — metadata can be edited later
    }

    setStage('uploading');

    try {
      await new Promise<void>((resolve, reject) => {
        const upload = UpChunk.createUpload({
          endpoint: init.uploadUrl,
          file: opts.file,
          chunkSize: 10240,
        });
        activeUploadRef.current = upload;
        upload.on('error', (e: any) =>
          reject(
            new Error(
              e?.detail?.message ||
                e?.detail ||
                'Audio upload failed. Check your connection and retry.'
            )
          )
        );
        upload.on('progress', (e: any) => {
          const pct = Math.round(e?.detail || 0);
          setProgress(pct);
          opts.onProgress?.(pct);
        });
        upload.on('success', () => resolve());
      });

      activeUploadRef.current = null;
      setStage('success');
      setUploading(false);

      // Fan-out activity feed event so followers see the new upload.
      // Mux processing may still be 'pending' here — that's fine; the feed
      // card resolves the latest track row at render time.
      try {
        const sb = supabase as unknown as any;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await sb.from('activity_feed_events').insert({
            actor_id: user.id,
            event_type: 'track_uploaded',
            target_track_id: init.trackId,
          });
        }
      } catch {
        /* ignore — feed event is non-essential */
      }

      return init.trackId;
    } catch (e: any) {
      activeUploadRef.current = null;
      setError(e?.message || 'Upload failed during transfer.');
      setErrorPhase('upload');
      setStage('error');
      setUploading(false);
      return null;
    }
  }, []);

  const retry = useCallback(async (): Promise<string | null> => {
    if (!lastOptsRef.current) return null;
    return upload(lastOptsRef.current);
  }, [upload]);

  return {
    upload,
    retry,
    reset,
    cancel,
    uploading,
    progress,
    error,
    errorPhase,
    stage,
    canRetry: stage === 'error' && !!lastOptsRef.current,
  };
}
