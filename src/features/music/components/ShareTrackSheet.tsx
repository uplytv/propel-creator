import { useEffect, useRef, useState } from 'react';
import { Share2, Download, Copy, X, Check } from 'lucide-react';
import { buildTrackShareUrl } from '@/lib/shareUrls';
import type { Track } from '../types';

interface Props {
  track: Track;
  open: boolean;
  onClose: () => void;
}

/**
 * Generates a 9:16 story-card image for a track and offers Web Share / save / copy link.
 */
export default function ShareTrackSheet({ track, open, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const trackUrl = buildTrackShareUrl(track.id, "web_share");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const render = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const W = 1080;
      const H = 1920;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0A0A0A');
      bg.addColorStop(0.5, '#1a0033');
      bg.addColorStop(1, '#001a0d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Cover art
      const coverSize = 760;
      const coverX = (W - coverSize) / 2;
      const coverY = 360;
      try {
        if (track.cover_art_url) {
          const img = await loadImage(track.cover_art_url);
          if (!cancelled) {
            roundRect(ctx, coverX, coverY, coverSize, coverSize, 48);
            ctx.save();
            ctx.clip();
            ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
            ctx.restore();
          }
        } else {
          roundRect(ctx, coverX, coverY, coverSize, coverSize, 48);
          const grad = ctx.createLinearGradient(coverX, coverY, coverX + coverSize, coverY + coverSize);
          grad.addColorStop(0, '#3D7CFF');
          grad.addColorStop(1, '#B025FF');
          ctx.fillStyle = grad;
          ctx.fill();
        }
      } catch {
        // ignore cover load failure; gradient stays
      }

      // UPLY logo
      ctx.fillStyle = '#00FF85';
      ctx.font = 'bold 72px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('UPLY', W / 2, 200);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '32px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('NOW PLAYING', W / 2, 260);

      // Title
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 84px "Space Grotesk", sans-serif';
      wrapText(ctx, track.title, W / 2, coverY + coverSize + 130, W - 160, 96, 2);

      // Genre / footer
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '40px "Plus Jakarta Sans", sans-serif';
      if (track.genre) ctx.fillText(track.genre, W / 2, H - 280);

      ctx.fillStyle = '#00FF85';
      ctx.font = 'bold 44px "Space Grotesk", sans-serif';
      ctx.fillText('uply.tv', W / 2, H - 180);

      if (!cancelled) setDataUrl(canvas.toDataURL('image/png'));
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [open, track]);

  if (!open) return null;

  const handleNativeShare = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${track.title}.png`, { type: 'image/png' });
      // @ts-ignore - canShare optional on some browsers
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: track.title,
          text: `Listen to "${track.title}" on UPLY`,
          url: trackUrl,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: track.title,
          text: `Listen to "${track.title}" on UPLY`,
          url: trackUrl,
        });
      } else {
        handleCopy();
      }
    } catch {
      // user cancelled
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(trackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `uply-${track.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#0A0A0A] border-t sm:border border-white/10 sm:rounded-3xl rounded-t-3xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">Share to story</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 text-white flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden bg-black border border-white/10">
          {dataUrl ? (
            <img src={dataUrl} alt="Story preview" className="w-full aspect-[9/16] object-contain" />
          ) : (
            <div className="w-full aspect-[9/16] flex items-center justify-center text-white/40 text-sm">
              Generating preview…
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-[#00FF85] text-black font-bold text-xs"
          >
            <Share2 className="w-5 h-5" /> Share
          </button>
          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/5 text-white font-bold text-xs"
          >
            <Download className="w-5 h-5" /> Save image
          </button>
          <button
            onClick={handleCopy}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/5 text-white font-bold text-xs"
          >
            {copied ? <Check className="w-5 h-5 text-[#00FF85]" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(' ');
  let line = '';
  let lines: string[] = [];
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && line && lines[maxLines - 1] !== line) {
    lines[maxLines - 1] = line.replace(/\s\S+$/, '…');
  }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}
