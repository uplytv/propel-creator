import MuxPlayerComponent from '@mux/mux-player-react';

interface MuxPlayerProps {
  playbackId: string;
  title?: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
  streamType?: 'on-demand' | 'live' | 'll-live';
}

export const UPLYMuxPlayer = ({
  playbackId,
  title,
  autoPlay = false,
  muted = false,
  className,
  streamType = 'on-demand',
}: MuxPlayerProps) => {
  return (
    <MuxPlayerComponent
      playbackId={playbackId}
      metadata={{ video_title: title }}
      autoPlay={autoPlay}
      muted={muted}
      className={className}
      streamType={streamType}
      style={{ aspectRatio: '16/9', width: '100%' }}
      accentColor="#00FF85"
      theme="dark"
    />
  );
};

export default UPLYMuxPlayer;
