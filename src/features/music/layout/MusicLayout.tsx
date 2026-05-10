import { Outlet } from 'react-router-dom';
import PersistentPlayer from '../components/AudioPlayer/PersistentPlayer';

/**
 * MusicLayout: never unmounts on /music/* navigation. Keeps the audio element
 * and player UI alive so playback continues across page transitions.
 */
export default function MusicLayout() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Outlet />
      <PersistentPlayer />
    </div>
  );
}
