import { useState } from 'react';
import { X, Copy } from 'lucide-react';
import { useTrackEmbed } from '../hooks/useTrackEmbed';

export default function EmbedCodeModal({
  trackId,
  open,
  onClose,
}: {
  trackId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { iframeHtml, copyToClipboard } = useTrackEmbed(trackId);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white">Embed code</h2>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <textarea
          readOnly
          value={iframeHtml}
          rows={5}
          className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white/80 font-mono"
        />
        <button
          onClick={copyToClipboard}
          className="w-full mt-3 py-3 rounded-full bg-[#3D7CFF] text-black font-bold inline-flex items-center justify-center gap-2"
          style={{ minHeight: 44 }}
        >
          <Copy className="w-4 h-4" /> Copy iframe
        </button>
      </div>
    </div>
  );
}
