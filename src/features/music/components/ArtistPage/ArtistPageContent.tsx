import { useMemo } from 'react';
import HeroSection from './HeroSection';
import SocialRow from './SocialRow';
import TabPillNav from './TabPillNav';
import MusicSection from './MusicSection';
import ShowsSection from './ShowsSection';
import RemixesSection from './RemixesSection';
import DJSetsSection from './DJSetsSection';
import AboutSection from './AboutSection';
import PageFooter from './PageFooter';
import VaultSection from './VaultSection';

interface Props {
  userId: string;
  profile: any; // artist_profiles row
  basicProfile: { display_name?: string | null; username?: string | null } | null;
  mode: 'public' | 'app';
}

const TAB_LABEL: Record<string, string> = {
  music: 'Songs',
  vault: 'Vault',
  shows: 'Shows',
  remixes: 'Remixes',
  djsets: 'DJ Sets',
  about: 'About',
};


export default function ArtistPageContent({ userId, profile, basicProfile, mode }: Props) {
  const theme = (profile?.page_theme || {}) as Record<string, any>;
  const sectionOrder: string[] = profile?.section_order ?? ['hero', 'social', 'music', 'vault', 'shows', 'remixes', 'djsets', 'about'];

  const visibility: Record<string, boolean> = profile?.section_visibility ?? {};
  const isVisible = (k: string) => visibility[k] !== false;

  const displayName = basicProfile?.display_name || basicProfile?.username || 'Artist';

  const cssVars: React.CSSProperties = {
    ['--bg' as any]: theme.background_color || '#0A0E27',
    ['--bg-card' as any]: 'rgba(255,255,255,0.06)',
    ['--bg-card-hover' as any]: 'rgba(255,255,255,0.10)',
    ['--border' as any]: 'rgba(255,255,255,0.10)',
    ['--text' as any]: theme.text_color || '#FFFFFF',
    ['--text-muted' as any]: 'rgba(255,255,255,0.65)',
    ['--accent' as any]: theme.accent_color || '#3D7CFF',
    ['--accent-2' as any]: theme.accent_color_2 || '#B025FF',
  };

  const tabs = useMemo(() => sectionOrder
    .filter((s) => ['music', 'vault', 'shows', 'remixes', 'djsets'].includes(s) && isVisible(s))
    .map((s) => ({ id: s, label: TAB_LABEL[s] })), [sectionOrder, JSON.stringify(visibility)]);


  return (
    <div
      style={{ ...cssVars, background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
    >
      {sectionOrder.map((s) => {
        if (!isVisible(s)) return null;
        switch (s) {
          case 'hero':
            return (
              <HeroSection
                key={s}
                displayName={displayName}
                heroLogoUrl={profile?.hero_logo_url}
                heroImageUrl={profile?.hero_image_url}
                tagline={profile?.tagline}
              />
            );
          case 'social':
            return (
              <div key={s}>
                <SocialRow social={profile?.social_links} />
                {tabs.length > 0 && <TabPillNav tabs={tabs} />}
              </div>
            );
          case 'music':
            return <MusicSection key={s} userId={userId} mode={mode} />;
          case 'vault':
            return <VaultSection key={s} userId={userId} />;

          case 'shows':
            return <ShowsSection key={s} userId={userId} />;
          case 'remixes':
            return <RemixesSection key={s} userId={userId} mode={mode} />;
          case 'djsets':
            return <DJSetsSection key={s} userId={userId} mode={mode} />;
          case 'about':
            return <AboutSection key={s} aboutMd={profile?.about_md} />;
          default:
            return null;
        }
      })}
      <PageFooter displayName={displayName} showPoweredBy={theme.show_powered_by !== false} />
    </div>
  );
}
