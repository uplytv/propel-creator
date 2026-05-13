import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Library, Search, Radio, MoreHorizontal, Bell, Sparkles } from 'lucide-react';
import { useRadioStations } from '../hooks/useRadioStations';
import RadioStationCard from '../components/RadioStationCard';
import { useUpcomingPremieres } from '../hooks/usePremieres';
import PremiereCard from '../components/PremiereCard';
// audio-rooms archived
import { useAuth } from '@/context/AuthContext';
import { useMusicFeed } from '../hooks/useMusicFeed';
import { useRecentlyPlayed } from '../hooks/useRecentlyPlayed';
import {
  useDailyMixes,
  useBecauseYouListened,
} from '../hooks/usePersonalizedMixes';
import { useDailyMixesFromTable } from '../hooks/useRecs';
import TrackCard from '../components/TrackCard';
import DailyMixCard from '../components/DailyMixCard';
import ChartsSection from '../components/ChartsSection';
import FriendActivityRail from '../components/FriendActivityRail';
import GenreChip from '../components/GenreChip';
import { GENRES } from '../lib/genres';
import SpotlightCard from '../components/SpotlightCard';
import { useEditorialSpotlights } from '../hooks/useEditorialSpotlights';
import NotificationBell from '../components/NotificationBell';
import WeeklyRecapCard from '../components/WeeklyRecapCard';
import { useRecentStations } from '../hooks/useRecentStations';
import StartStationButton from '../components/StartStationButton';

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-white px-4">{title}</h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-4 lg:grid-cols-6 sm:overflow-visible">
        {children}
      </div>
    </section>
  );
}

export default function MusicHome() {
  const { user } = useAuth();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const { data, isLoading } = useMusicFeed(user?.id);
  const { data: recentlyPlayed } = useRecentlyPlayed(12);
  const { data: dailyMixes } = useDailyMixes(20);
  const { data: dailyMixesTable } = useDailyMixesFromTable();
  const { data: because } = useBecauseYouListened(12);
  const { data: stations } = useRadioStations();
  const { data: premieres } = useUpcomingPremieres();
  const liveRooms: any[] = []; // audio-rooms archived
  const { data: spotlights } = useEditorialSpotlights();

  return (
    <div className="pb-40">
      <header className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-black"
            style={{
              background: 'linear-gradient(90deg,#3D7CFF,#B025FF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            uply music
          </h1>
          <p className="text-xs text-white/50">stream what creators are dropping</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Desktop / >=sm: full icon group */}
          <div className="hidden sm:flex gap-2 items-center">
            {user && <NotificationBell />}
            <Link to="/music/search" className="p-2 rounded-full bg-white/5 text-white" aria-label="Search">
              <Search className="w-5 h-5" />
            </Link>
            <Link to="/music/library" className="p-2 rounded-full bg-white/5 text-white" aria-label="Library">
              <Library className="w-5 h-5" />
            </Link>
            <Link
              to="/music/labs"
              className="px-3 py-2 rounded-full bg-white/5 text-[#00FF85] text-xs font-semibold flex items-center gap-1"
              aria-label="Music Labs — every feature"
              title="Music Labs — every feature"
            >
              <span aria-hidden>✦</span> Labs
            </Link>
          </div>

          {/* Mobile: collapse bell/search/library/labs into a "…" overflow */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setOverflowOpen((v) => !v)}
              className="p-2 rounded-full bg-white/5 text-white"
              aria-label="More"
              aria-expanded={overflowOpen}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {overflowOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOverflowOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-50 min-w-[180px] rounded-xl border border-white/10 bg-[#0A0A0A] shadow-xl py-1.5">
                  {user && (
                    <Link
                      to="/music/notifications"
                      onClick={() => setOverflowOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5"
                    >
                      <Bell className="w-4 h-4" /> Notifications
                    </Link>
                  )}
                  <Link
                    to="/music/search"
                    onClick={() => setOverflowOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5"
                  >
                    <Search className="w-4 h-4" /> Search
                  </Link>
                  <Link
                    to="/music/library"
                    onClick={() => setOverflowOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5"
                  >
                    <Library className="w-4 h-4" /> Library
                  </Link>
                  <Link
                    to="/music/labs"
                    onClick={() => setOverflowOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[#00FF85] hover:bg-white/5"
                  >
                    <Sparkles className="w-4 h-4" /> Labs
                  </Link>
                </div>
              </>
            )}
          </div>

          <Link
            to="/music/feed"
            className="px-3 py-2 rounded-full bg-white/5 text-white text-xs font-semibold"
            aria-label="Feed"
          >
            Feed
          </Link>
          <Link
            to="/music/upload"
            className="px-4 py-2 rounded-full text-white font-semibold flex items-center gap-1.5 text-sm"
            style={{ background: 'linear-gradient(90deg,#3D7CFF,#B025FF)' }}
          >
            <Upload className="w-4 h-4" /> Upload
          </Link>
        </div>
      </header>

      <div className="space-y-8">
        {user && <WeeklyRecapCard />}

        {(spotlights?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-lg font-bold text-white">Spotlight</h2>
              <Link to="/music/browse" className="text-xs text-white/60">Browse all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2">
              {spotlights!.map((s) => (
                <SpotlightCard key={s.id} item={s} />
              ))}
            </div>
          </section>
        )}

        {(stations?.some((s) => s.is_live) || (premieres?.length ?? 0) > 0 || (liveRooms?.length ?? 0) > 0) && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-400" /> Live Now
              </h2>
              <Link to="/music/live" className="text-xs text-white/60">See all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2">
              {(stations ?? []).filter((s) => s.is_live).map((s) => (
                <RadioStationCard key={s.id} station={s} />
              ))}
              {/* audio-rooms archived */}
              {(premieres ?? []).slice(0, 4).map((p) => (
                <PremiereCard key={p.id} premiere={p} />
              ))}
            </div>
          </section>
        )}

        {user && (recentlyPlayed?.length ?? 0) > 0 && (
          <Row title="Jump Back In">
            {recentlyPlayed!.map((t) => (
              <TrackCard key={t.id} track={t} queue={recentlyPlayed} />
            ))}
          </Row>
        )}

        {user && <FriendActivityRail />}

        {user && (dailyMixesTable?.length ?? 0) > 0 && (
          <Row title="Made For You">
            {dailyMixesTable!.map(({ mix, tracks }) => (
              <DailyMixCard
                key={mix.id}
                title={mix.title}
                subtitle={mix.description ?? mix.seed_genres.join(' · ')}
                tracks={tracks}
              />
            ))}
          </Row>
        )}

        {user && (dailyMixesTable?.length ?? 0) === 0 && (dailyMixes?.length ?? 0) > 0 && (
          <Row title="Made For You">
            {dailyMixes!.map((mix) => (
              <DailyMixCard
                key={mix.id}
                title={mix.title}
                subtitle={mix.subtitle}
                tracks={mix.tracks}
              />
            ))}
          </Row>
        )}

        {user && because && because.tracks.length > 0 && (
          <Row title={`Because you listened to ${because.seed.title}`}>
            {because.tracks.map((t) => (
              <TrackCard key={t.id} track={t} queue={because.tracks} />
            ))}
          </Row>
        )}

        <Row title="For You">
          {(data?.forYou ?? []).map((t) => (
            <TrackCard key={t.id} track={t} queue={data?.forYou} />
          ))}
          {!isLoading && !data?.forYou.length && (
            <div className="text-sm text-white/50 px-1 flex flex-col gap-2">
              <span>Play a few tracks to personalize this.</span>
              <Link
                to="/music/browse"
                className="self-start text-xs px-3 py-1.5 rounded-full bg-[#00FF85] text-black font-semibold"
              >
                Browse music
              </Link>
            </div>
          )}
        </Row>

        <Row title="New Releases">
          {(data?.newReleases ?? []).map((t) => (
            <TrackCard key={t.id} track={t} queue={data?.newReleases} />
          ))}
        </Row>

        <Row title="Trending Now">
          {(data?.trending ?? []).map((t) => (
            <TrackCard key={t.id} track={t} queue={data?.trending} />
          ))}
        </Row>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white px-4">Browse by Genre</h2>
          <div className="flex gap-2 overflow-x-auto px-4 pb-2">
            {GENRES.map((g) => (
              <GenreChip key={g} genre={g} />
            ))}
          </div>
        </section>

        <ChartsSection />

        {user && (data?.following?.length ?? 0) > 0 && (
          <Row title="From Creators You Follow">
            {(data?.following ?? []).map((t: any) => (
              <TrackCard key={t.id} track={t} queue={data?.following} />
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
