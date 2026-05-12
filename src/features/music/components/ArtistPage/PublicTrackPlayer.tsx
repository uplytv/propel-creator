import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Pause, Play } from 'lucide-react';

interface Props {
  playbackId?: string | null;
  className?: string;
  label?: string;
}

// Scoped HLS audio button for the public artist page (no global player).
export default function PublicTrackPlayer({ playbackId, className, label = 'Play' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { hlsRef.current?.destroy(); hlsRef.current = null; }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !playbackId) return;
    if (playing) { audio.pause(); return; }
    if (!audio.src && !hlsRef.current) {
      const url = `https://stream.mux.com/${playbackId}.m3u8`;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(url);
        hls.attachMedia(audio);
        hlsRef.current = hls;
      } else {
        audio.src = url;
      }
    }
    try { await audio.play(); } catch {}
  };

  return (
    <>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={!playbackId}
        className={
          className ||
          'inline-flex items-center gap-2 px-5 py-2 rounded-full border text-[14px] font-semibold transition disabled:opacity-40'
        }
        style={{ borderColor: 'var(--text)' }}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        {playing ? 'Pause' : label}
      </button>
    </>
  );
}
