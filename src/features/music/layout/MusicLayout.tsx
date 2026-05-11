import { Outlet } from 'react-router-dom';

/**
 * MusicLayout: never unmounts on /music/* navigation.
 * PersistentPlayer is mounted globally in App.tsx so playback persists across all routes.
 */
export default function MusicLayout() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Outlet />
    </div>
  );
}
