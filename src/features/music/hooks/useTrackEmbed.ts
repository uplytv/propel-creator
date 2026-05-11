import { toast } from 'sonner';

export function useTrackEmbed(trackId: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://uply.tv';
  const embedUrl = `${origin}/embed/track/${trackId}`;
  const iframeHtml = `<iframe src="${embedUrl}" width="100%" height="180" frameborder="0" allow="autoplay; clipboard-write" style="border-radius:12px;"></iframe>`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(iframeHtml);
      toast.success('Embed code copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return { embedUrl, iframeHtml, copyToClipboard };
}
