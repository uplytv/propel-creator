import { Download, DownloadCloud } from "lucide-react";
import { useIsDownloaded, useToggleDownload } from "../hooks/useDownloads";

interface Props {
  trackId: string;
  className?: string;
}

export default function DownloadButton({ trackId, className = "" }: Props) {
  const { data: isDownloaded } = useIsDownloaded(trackId);
  const toggle = useToggleDownload(trackId);

  return (
    <button
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      aria-pressed={!!isDownloaded}
      aria-label={isDownloaded ? "Remove download" : "Download for offline"}
      className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full transition ${className}`}
      style={{
        background: isDownloaded ? "#3D7CFF" : "rgba(255,255,255,0.08)",
        color: isDownloaded ? "#000" : "#fff",
      }}
    >
      {isDownloaded ? <DownloadCloud className="w-4 h-4" /> : <Download className="w-4 h-4" />}
    </button>
  );
}
