import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useStreamDownload() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const downloadRecording = useCallback(async (muxAssetId: string, title?: string) => {
    if (!muxAssetId || downloading) return;
    setDownloading(true);
    setProgress(10);

    try {
      const { data, error } = await supabase.functions.invoke('download-asset', {
        body: { asset_id: muxAssetId },
      });

      if (error || !data?.url) throw new Error(error?.message || 'Failed to get download URL');

      setProgress(30);

      const response = await fetch(data.url);
      if (!response.ok) throw new Error('Download failed');

      const reader = response.body?.getReader();
      const contentLength = Number(response.headers.get('content-length')) || 0;
      const chunks: Uint8Array[] = [];
      let received = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (contentLength > 0) {
            setProgress(30 + Math.floor((received / contentLength) * 65));
          }
        }
      }

      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'recording').replace(/[^a-z0-9]/gi, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast({ title: 'Download complete! 🎬' });
    } catch (err: any) {
      toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setProgress(0);
      }, 1500);
    }
  }, [downloading, toast]);

  return { downloadRecording, downloading, progress };
}
