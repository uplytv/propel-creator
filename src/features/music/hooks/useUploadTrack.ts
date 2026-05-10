import { useState } from 'react';
import * as UpChunk from '@mux/upchunk';
import { supabase } from '@/integrations/supabase/client';

interface InitResp {
  trackId: string;
  uploadUrl: string;
  uploadId: string;
}

export interface UploadOptions {
  title: string;
  genre?: string | null;
  is_explicit?: boolean;
  description?: string | null;
  cover_art_url?: string | null;
  file: File;
  onProgress?: (pct: number) => void;
}

export function useUploadTrack() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(opts: UploadOptions): Promise<string | null> {
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('music-upload-init', {
        body: {
          title: opts.title,
          genre: opts.genre ?? null,
          is_explicit: !!opts.is_explicit,
        },
      });
      if (fnErr || !data) throw new Error(fnErr?.message || 'init failed');
      const init = data as InitResp;

      // Persist optional metadata directly (RLS: owner-only)
      const sb = supabase as unknown as any;
      const patch: Record<string, any> = {};
      if (opts.description) patch.description = opts.description;
      if (opts.cover_art_url) patch.cover_art_url = opts.cover_art_url;
      if (Object.keys(patch).length) {
        await sb.from('tracks').update(patch).eq('id', init.trackId);
      }

      await new Promise<void>((resolve, reject) => {
        const upload = UpChunk.createUpload({
          endpoint: init.uploadUrl,
          file: opts.file,
          chunkSize: 5120,
        });
        upload.on('error', (e: any) => reject(new Error(e?.detail || 'upload failed')));
        upload.on('progress', (e: any) => {
          const pct = Math.round(e?.detail || 0);
          setProgress(pct);
          opts.onProgress?.(pct);
        });
        upload.on('success', () => resolve());
      });

      return init.trackId;
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, progress, error };
}
