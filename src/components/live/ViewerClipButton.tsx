import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Share2, Download, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useViewerClip } from '@/hooks/useViewerClip';
import { useEffect } from 'react';

interface ViewerClipButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
}

export default function ViewerClipButton({ videoRef, isPlaying }: ViewerClipButtonProps) {
  const {
    isClipping,
    clipUrl,
    clipBlob,
    startBuffering,
    stopBuffering,
    createClip,
    clearClip,
    shareClip,
  } = useViewerClip(videoRef, 30);

  // Start buffering when playing
  useEffect(() => {
    if (isPlaying) {
      startBuffering();
    }
    return () => stopBuffering();
  }, [isPlaying, startBuffering, stopBuffering]);

  return (
    <>
      {/* Clip button */}
      <button
        onClick={() => createClip(30)}
        disabled={isClipping}
        className="p-2 rounded-lg bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
        title="Clip last 30 seconds"
      >
        {isClipping ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Scissors className="w-4 h-4" />
        )}
      </button>

      {/* Clip preview modal */}
      <AnimatePresence>
        {clipUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={clearClip}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-4 max-w-sm w-full mx-4 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Clip Created!</h3>
                </div>
                <button onClick={clearClip}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <video
                src={clipUrl}
                controls
                autoPlay
                className="w-full rounded-xl aspect-video bg-black"
              />

              <div className="flex gap-2">
                <Button size="sm" variant="hero" className="flex-1" onClick={shareClip}>
                  <Share2 className="w-4 h-4 mr-1.5" /> Share
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (clipUrl) {
                      const a = document.createElement('a');
                      a.href = clipUrl;
                      a.download = 'clip.webm';
                      a.click();
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
