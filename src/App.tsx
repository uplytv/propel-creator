import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import CuratedFollowAnnouncer from "@/components/CuratedFollowAnnouncer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { FeatureProvider } from "@/context/FeatureContext";
import { NetworkProvider } from "@/context/NetworkContext";
import TierCelebration from "@/components/TierCelebration";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import InstallPrompt from "@/components/InstallPrompt";
import PushNotificationPermission from "@/components/PushNotificationPermission";
import UploadRecovery from "@/components/UploadRecovery";
import PersistentPlayer from "@/features/music/components/AudioPlayer/PersistentPlayer";
import OfflineScreen from "@/components/OfflineScreen";
import SplashScreen from "@/components/SplashScreen";
import { useNativeInit, useKeyboardState } from "@/hooks/useNativePlatform";
import { AnimatePresence } from "framer-motion";
import { capturePageView } from "@/lib/posthog";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Scan = lazy(() => import("./pages/Scan"));
const ScanEvent = lazy(() => import("./pages/ScanEvent"));
const EventCommandCenter = lazy(() => import("./pages/EventCommandCenter"));
const EventLiveStream = lazy(() => import("./pages/EventLiveStream"));
const Repurpose = lazy(() => import("./pages/Repurpose"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Apply = lazy(() => import("./pages/Apply"));
const WaitlistPage = lazy(() => import("./pages/WaitlistPage"));
const Founders = lazy(() => import("./pages/Founders"));
const InviteCodes = lazy(() => import("./pages/InviteCodes"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const MyRep = lazy(() => import("./pages/MyRep"));
const Grow = lazy(() => import("./pages/Grow"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const CreatorAffiliate = lazy(() => import("./pages/CreatorAffiliate"));
const Settings = lazy(() => import("./pages/Settings"));
const SettingsConnections = lazy(() => import("./pages/SettingsConnections"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Collaborate = lazy(() => import("./pages/Collaborate"));
const JointProduct = lazy(() => import("./pages/JointProduct"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AryaXO = lazy(() => import("./pages/AryaXO"));
const AryaXOSite = lazy(() => import("./pages/AryaXOSite"));
const AryaXOBlog = lazy(() => import("./pages/AryaXOBlog"));
const ArtistLinkRoute = lazy(() => import("./pages/ArtistLinkRoute"));
const ArtistSiteRoute = lazy(() => import("./pages/ArtistSiteRoute"));
const UplyBlog = lazy(() => import("./pages/UplyBlog"));
const UplyBlogPost = lazy(() => import("./pages/UplyBlogPost"));
const AdminBookingInquiries = lazy(() => import("./pages/AdminBookingInquiries"));
const Live = lazy(() => import("./pages/Live"));
const Stream = lazy(() => import("./pages/Stream"));
const GoLive = lazy(() => import("./pages/GoLive"));
const StreamCountdown = lazy(() => import("./pages/StreamCountdown"));
const BuyCredits = lazy(() => import("./pages/BuyCredits"));
const AdIntegrations = lazy(() => import("./pages/AdIntegrations"));
const Jobs = lazy(() => import("./pages/Jobs"));
const PostJob = lazy(() => import("./pages/PostJob"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const TalentProfile = lazy(() => import("./pages/TalentProfile"));
const JobMessages = lazy(() => import("./pages/JobMessages"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CreatorProfile = lazy(() => import("./pages/CreatorProfile"));
const Discover = lazy(() => import("./pages/Discover"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Playlists = lazy(() => import("./pages/Playlists"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));
const BoostSuccess = lazy(() => import("./pages/BoostSuccess"));
const BoostCancel = lazy(() => import("./pages/BoostCancel"));
const AdminPayouts = lazy(() => import("./pages/AdminPayouts"));
const AdminEventFees = lazy(() => import("./pages/AdminEventFees"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminFeatureToggles = lazy(() => import("./pages/AdminFeatureToggles"));
const AdminTVAudit = lazy(() => import("./pages/AdminTVAudit"));
const ContentLibrary = lazy(() => import("./pages/ContentLibrary"));
const CreatorSpace = lazy(() => import("./pages/CreatorSpace"));
const Launchpad = lazy(() => import("./pages/Launchpad"));
const AdminAffiliates = lazy(() => import("./pages/AdminAffiliates"));
const AdminReferrals = lazy(() => import("./pages/AdminReferrals"));
const ReferralRedirect = lazy(() => import("./pages/ReferralRedirect"));
const GrowthReports = lazy(() => import("./pages/GrowthReports"));
const Shorts = lazy(() => import("./pages/Shorts"));
const SearchPage = lazy(() => import("./pages/Search"));
const Trending = lazy(() => import("./pages/Trending"));
const ForYou = lazy(() => import("./pages/ForYou"));
const Following = lazy(() => import("./pages/Following"));
const NewCreators = lazy(() => import("./pages/NewCreators"));
const SmartLinkPage = lazy(() => import("./pages/SmartLinkPage"));
const PresaveCallback = lazy(() => import("./pages/PresaveCallback"));
const SmartLinks = lazy(() => import("./pages/SmartLinks"));
const SmartLinkCampaign = lazy(() => import("./pages/SmartLinkCampaign"));
const SmartLinkAnalyticsPage = lazy(() => import("./pages/SmartLinkAnalyticsPage"));
const SmartLinkDomains = lazy(() => import("./pages/SmartLinkDomains"));
const CategoryFeed = lazy(() => import("./pages/CategoryFeed"));
const Messages = lazy(() => import("./pages/Messages"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const VideoPlayer = lazy(() => import("./pages/VideoPlayer"));
const Events = lazy(() => import("./pages/Events"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const EventPage = lazy(() => import("./pages/EventPage"));
const GlobalEventDetail = lazy(() => import("./pages/GlobalEventDetail"));
const TicketDetail = lazy(() => import("./pages/TicketDetail"));
const TicketSuccess = lazy(() => import("./pages/TicketSuccess"));
const TicketWallet = lazy(() => import("./pages/TicketWallet"));
const StaffReentryRequests = lazy(() => import("./pages/StaffReentryRequests"));
const TVDiscover = lazy(() => import("./pages/tv/TVDiscover"));
const TVWatch = lazy(() => import("./pages/tv/TVWatch"));
const TVBuyRedirect = lazy(() => import("./pages/tv/TVBuyRedirect"));
const MusicLayout = lazy(() => import("./features/music/layout/MusicLayout"));
const MusicHome = lazy(() => import("./features/music/pages/MusicHome"));
const MusicSearch = lazy(() => import("./features/music/pages/MusicSearch"));
const MusicLibrary = lazy(() => import("./features/music/pages/MusicLibrary"));
const MusicUpload = lazy(() => import("./features/music/pages/MusicUpload"));
const GenrePage = lazy(() => import("./features/music/pages/GenrePage"));
const TrackPage = lazy(() => import("./features/music/pages/TrackPage"));
const PresaveCampaignSetupPage = lazy(() => import("./features/music/pages/PresaveCampaignSetupPage"));
const PresaveLandingPage = lazy(() => import("./features/music/pages/PresaveLandingPage"));
const AlbumPage = lazy(() => import("./features/music/pages/AlbumPage"));
const PlaylistPage = lazy(() => import("./features/music/pages/PlaylistPage"));
const MusicBlendPage = lazy(() => import("./features/music/pages/MusicBlendPage"));
const ListeningPartyPage = lazy(() => import("./features/music/pages/ListeningPartyPage"));
const MusicLivePage = lazy(() => import("./features/music/pages/MusicLivePage"));
const RadioStationPage = lazy(() => import("./features/music/pages/RadioStationPage"));
const PremierePage = lazy(() => import("./features/music/pages/PremierePage"));
// archived: AudioRoomPage (audio-rooms)
const MusicBrowsePage = lazy(() => import("./features/music/pages/MusicBrowsePage"));
const MusicNotificationsPage = lazy(() => import("./features/music/pages/MusicNotificationsPage"));
const MusicAnalyticsPage = lazy(() => import("./features/music/pages/MusicAnalyticsPage"));
const GroupBlendsPage = lazy(() => import("./features/music/pages/GroupBlendsPage"));
const ConcertsPage = lazy(() => import("./features/music/pages/ConcertsPage"));
const ConcertPage = lazy(() => import("./features/music/pages/ConcertPage"));
// archived: MusicLabsHub (music-labs)
const DSPConnectionsPage = lazy(() => import("./features/music/pages/DSPConnectionsPage"));
const MusicChartsPage = lazy(() => import("./features/music/pages/MusicChartsPage"));
const MusicCreatorAnalyticsPage = lazy(() => import("./features/music/pages/MusicCreatorAnalyticsPage"));
const MusicPodcastPage = lazy(() => import("./features/music/pages/MusicPodcastPage"));
// archived: KaraokePage (karaoke)
const LyricsSyncPage = lazy(() => import("./features/music/pages/LyricsSyncPage"));
// archived: DJConsolePage (dj-console)
const LongformPlayerPage = lazy(() => import("./features/music/pages/LongformPlayerPage"));
// archived: FanRadioPlayerPage (fan-radio)
const TourCalendarPage = lazy(() => import("./features/music/pages/TourCalendarPage"));
const TourMerchPage = lazy(() => import("./features/music/pages/TourMerchPage"));
const BookingInquiryPage = lazy(() => import("./features/music/pages/BookingInquiryPage"));
const MusicDistributionPage = lazy(() => import("./features/music/pages/DistributionPage"));
// archived: RoyaltyPayoutsPage (royalties), PublishingPage (publishing), SplitSheetsPage (split-sheets), SyncLicensingPage (sync-licensing), StemMarketplacePage (stem-marketplace), SamplePackPage (sample-packs), NFTDropsPage (nft-drops)
const MerchBundlesPage = lazy(() => import("./features/music/pages/MerchBundlesPage"));
const SuperThanksPage = lazy(() => import("./features/music/pages/SuperThanksPage"));
// archived: CollabStudioPage (collab-studio)
const GigMarketplacePage = lazy(() => import("./features/music/pages/GigMarketplacePage"));
const ArtistVerificationPage = lazy(() => import("./features/music/pages/ArtistVerificationPage"));
const SmartPlaylistsPage = lazy(() => import("./features/music/pages/SmartPlaylistsPage"));
const ArtistPage = lazy(() => import("./features/music/pages/ArtistPage"));
const ArtistPageEditor = lazy(() => import("./features/music/pages/ArtistPageEditor"));
const ArtistPageEditorAdvanced = lazy(() => import("./features/music/pages/ArtistPageEditorAdvanced"));
const PublicArtistPage = lazy(() => import("./features/music/pages/PublicArtistPage"));
const MusicFeedPage = lazy(() => import("./features/music/pages/MusicFeedPage"));
const TrackInsightsPage = lazy(() => import("./features/music/pages/TrackInsightsPage"));
const EmbedTrackPage = lazy(() => import("./features/music/pages/EmbedTrackPage"));
const ContentStudio = lazy(() => import("./pages/ContentStudio"));
const AITeamDashboard = lazy(() => import("./pages/AITeamDashboard"));
const AriaCommandPage = lazy(() => import("./features/aria-command/pages/AriaCommandPage"));
const GrowthAssistant = lazy(() => import("./pages/GrowthAssistant"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const MyPage = lazy(() => import("./pages/MyPage"));
const FunnelEditor = lazy(() => import("./pages/FunnelEditor"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const BrandDeal = lazy(() => import("./pages/BrandDeal"));
const Podcast = lazy(() => import("./pages/Podcast"));
const RadiateFeedPage = lazy(() => import("./pages/radiate/RadiateFeedPage"));
const RadiateNewPage = lazy(() => import("./pages/radiate/RadiateNewPage"));
const RadiateManagePage = lazy(() => import("./pages/radiate/RadiateManagePage"));
const UsernameRedirect = lazy(() => import("./pages/UsernameRedirect"));
const SocialCreatorPage = lazy(() => import("./components/creatorprofile/social/SocialCreatorPage"));
const PodcastRSS = lazy(() => import("./pages/PodcastRSS"));
const NetworkFeed = lazy(() => import("./pages/NetworkFeed"));
const Distribution = lazy(() => import("./pages/Distribution"));
const AdsHub = lazy(() => import("./pages/AdsHub"));
const DeveloperAPI = lazy(() => import("./pages/DeveloperAPI"));
const EmailUnsubscribe = lazy(() => import("./pages/EmailUnsubscribe"));
const Subscribers = lazy(() => import("./pages/Subscribers"));
const EmailBroadcast = lazy(() => import("./pages/EmailBroadcast"));
const EmailAnalytics = lazy(() => import("./pages/EmailAnalytics"));
const DripSequences = lazy(() => import("./pages/DripSequences"));
const EventRSVP = lazy(() => import("./pages/EventRSVP"));
const Camera = lazy(() => import("./pages/Camera"));
const PostEditor = lazy(() => import("./pages/create/PostEditor"));
const StoryEditor = lazy(() => import("./pages/create/StoryEditor"));
const ShortEditor = lazy(() => import("./pages/create/ShortEditor"));
const VideoEditorPage = lazy(() => import("./pages/create/VideoEditor"));
const Health = lazy(() => import("./pages/Health"));

// Social pages
const SocialHome = lazy(() => import("./pages/social/SocialHome"));
const SocialLocal = lazy(() => import("./pages/social/SocialLocal"));
const SocialFriends = lazy(() => import("./pages/social/SocialFriends"));
const SocialProducers = lazy(() => import("./pages/social/SocialProducers"));
const SocialPeople = lazy(() => import("./pages/social/SocialPeople"));
import SocialLayout from "./components/social/SocialLayout";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/shop/CartDrawer";
const Shop = lazy(() => import("./pages/Shop"));
const Inbox = lazy(() => import("./pages/Inbox"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function ScrollToTop() {
  const location = useLocation();

  useLayoutEffect(() => {
    const mainContent = document.getElementById("main-content");
    mainContent?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    capturePageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
}

function PersistentPlayerGate() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/@')) return null;
  return <PersistentPlayer />;
}

function NativeShell({ children }: { children: React.ReactNode }) {
  useNativeInit();
  useKeyboardState();

  // Never blank the app on first render based on navigator.onLine — that flag
  // misreports inside service-worker/webview contexts and would show a dark
  // full-screen takeover. Start as online and only react to a real transition.
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (isOffline) return <OfflineScreen />;

  return <>{children}</>;
}

function AppWithSplash({ children }: { children: React.ReactNode }) {
  const splashKey = "uply_splash_shown";
  const alreadyShown = sessionStorage.getItem(splashKey) === "1";
  const [showSplash, setShowSplash] = useState(!alreadyShown);

  const handleComplete = () => {
    sessionStorage.setItem(splashKey, "1");
    setShowSplash(false);
  };

  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen onComplete={handleComplete} />
      </AnimatePresence>
    );
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <AppProvider>
            <FeatureProvider>
              <NetworkProvider>
              <CartProvider>
              <NativeShell>
              <Toaster />
              <Sonner />
              <CuratedFollowAnnouncer />
              <TierCelebration />
              <CartDrawer />
              <InstallPrompt />
              <PushNotificationPermission />
              <AppWithSplash>
              <UploadRecovery />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ScrollToTop />
                <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <RouteErrorBoundary section="Page">
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/index" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/health" element={<Health />} />
                    <Route path="/p/:slug" element={<JointProduct isPublic />} />
                    <Route path="/live" element={<Live />} />
                    <Route path="/stream/:id" element={<Stream />} />
                    <Route path="/tickets" element={<TicketWallet />} />
                    <Route path="/tickets/success" element={<TicketSuccess />} />
                    <Route path="/staff/reentry-requests" element={<ProtectedRoute><StaffReentryRequests /></ProtectedRoute>} />
                    <Route path="/stream/:id/countdown" element={<StreamCountdown />} />
                    <Route path="/creator/:username/videos/:id" element={<VideoPlayer />} />
                    <Route path="/:username/live/:slug" element={<Stream />} />
                    <Route path="/:username/videos/:slug" element={<VideoPlayer />} />
                    <Route path="/:username/clips/:slug" element={<Stream />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    <Route path="/email-unsubscribe" element={<EmailUnsubscribe />} />
                    <Route path="/ref/:code" element={<ReferralRedirect />} />
                    <Route path="/join/:username/:code" element={<ReferralRedirect />} />
                    <Route path="/join/:code" element={<ReferralRedirect />} />
                    <Route path="/invite/:code" element={<ReferralRedirect />} />
                    <Route path="/creator/:username" element={<UsernameRedirect />} />
                    <Route path="/community/:creatorId" element={<CreatorSpace />} />
                    <Route path="/community/:creatorId/:tab" element={<CreatorSpace />} />
                    <Route path="/space/:creatorId" element={<CreatorSpace />} />
                    <Route path="/space/:creatorId/:tab" element={<CreatorSpace />} />
                    <Route path="/discover" element={<ProtectedRoute><Discover /></ProtectedRoute>} />
                    <Route path="/shorts" element={<Shorts />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/upgrade" element={<Upgrade />} />
                    <Route path="/event/rsvp/:eventId" element={<EventRSVP />} />

                    {/* Social routes — MUST be before /:username catch-all */}
                    <Route path="/social" element={<ProtectedRoute><SocialLayout /></ProtectedRoute>}>
                      <Route index element={<SocialHome />} />
                      <Route path="local" element={<SocialLocal />} />
                      <Route path="friends" element={<SocialFriends />} />
                      <Route path="producers" element={<SocialProducers />} />
                      <Route path="people" element={<SocialPeople />} />
                    </Route>

                    <Route path="/:username/events/:slug" element={<EventPage />} />
                    <Route path="/creator/:username/events/:slug" element={<EventPage />} />
                    <Route path="/tickets/:token" element={<TicketDetail />} />

                    {/* SmartLinks — MUST be before /:username catch-all */}
                    <Route path="/link/:slug" element={<SmartLinkPage />} />
                    <Route path="/presave/callback" element={<PresaveCallback />} />
                    <Route path="/presave/:slug" element={<PresaveLandingPage />} />
                    <Route path="/smart-links" element={<ProtectedRoute><SmartLinks /></ProtectedRoute>} />
                    <Route path="/smart-links/campaign" element={<ProtectedRoute><SmartLinkCampaign /></ProtectedRoute>} />
                    <Route path="/smart-links/:id/analytics" element={<ProtectedRoute><SmartLinkAnalyticsPage /></ProtectedRoute>} />
                    <Route path="/smart-links/domains" element={<ProtectedRoute><SmartLinkDomains /></ProtectedRoute>} />

                    {/* Radiate — geo-radius local discovery */}
                    <Route path="/radiate" element={<RadiateFeedPage />} />
                    <Route path="/radiate/new" element={<ProtectedRoute><RadiateNewPage /></ProtectedRoute>} />
                    <Route path="/radiate/manage" element={<ProtectedRoute><RadiateManagePage /></ProtectedRoute>} />

                    {/* UPLY TV (must come before /:username catch-all) */}
                    <Route path="/tv" element={<TVDiscover />} />
                    <Route path="/tv/watch/:streamId" element={<TVWatch />} />
                    <Route path="/buy/:token" element={<TVBuyRedirect />} />

                    {/* Music embed (bare, no MusicLayout chrome) */}
                    <Route path="/embed/track/:id" element={<EmbedTrackPage />} />

                    {/* Music module (must come before /:username catch-all) */}
                    <Route path="/music" element={<MusicLayout />}>
                      <Route index element={<MusicHome />} />
                      <Route path="search" element={<MusicSearch />} />
                      <Route path="library" element={<ProtectedRoute><MusicLibrary /></ProtectedRoute>} />
                      <Route path="upload" element={<ProtectedRoute><MusicUpload /></ProtectedRoute>} />
                      <Route path="genre/:genre" element={<GenrePage />} />
                      <Route path="track/:id" element={<TrackPage />} />
                      <Route path="track/:id/presave/setup" element={<ProtectedRoute><PresaveCampaignSetupPage /></ProtectedRoute>} />
                      <Route path="album/:id" element={<AlbumPage />} />
                      <Route path="playlist/:id" element={<PlaylistPage />} />
                      <Route path="blend/:userId" element={<ProtectedRoute><MusicBlendPage /></ProtectedRoute>} />
                      <Route path="party/:code" element={<ListeningPartyPage />} />
                      <Route path="live" element={<MusicLivePage />} />
                      <Route path="radio/:id" element={<RadioStationPage />} />
                      <Route path="premiere/:id" element={<PremierePage />} />
                      {/* archived: room/:id (audio-rooms) */}
                      <Route path="browse" element={<MusicBrowsePage />} />
                      <Route path="notifications" element={<ProtectedRoute><MusicNotificationsPage /></ProtectedRoute>} />
                      <Route path="analytics" element={<ProtectedRoute><MusicAnalyticsPage /></ProtectedRoute>} />
                      <Route path="blends" element={<ProtectedRoute><GroupBlendsPage /></ProtectedRoute>} />
                      <Route path="concerts" element={<ConcertsPage />} />
                      <Route path="concerts/:id" element={<ConcertPage />} />
                      {/* archived: labs (music-labs) */}
                      <Route path="connections" element={<ProtectedRoute><DSPConnectionsPage /></ProtectedRoute>} />
                      <Route path="charts" element={<MusicChartsPage />} />
                      <Route path="creator-analytics" element={<ProtectedRoute><MusicCreatorAnalyticsPage /></ProtectedRoute>} />
                      <Route path="podcast" element={<MusicPodcastPage />} />
                      {/* archived: karaoke */}
                      <Route path="lyrics-sync" element={<LyricsSyncPage />} />
                      {/* archived: dj (dj-console) */}
                      <Route path="longform" element={<LongformPlayerPage />} />
                      {/* archived: radio-player (fan-radio) */}
                      <Route path="tour" element={<TourCalendarPage />} />
                      <Route path="tour-merch" element={<TourMerchPage />} />
                      <Route path="booking" element={<ProtectedRoute><BookingInquiryPage /></ProtectedRoute>} />
                      <Route path="distribution" element={<ProtectedRoute><MusicDistributionPage /></ProtectedRoute>} />
                      {/* archived: royalties, publishing, splits, sync, stems, samples, nft-drops */}
                      <Route path="merch-bundles" element={<MerchBundlesPage />} />
                      <Route path="super-thanks" element={<SuperThanksPage />} />
                      {/* archived: collab (collab-studio) */}
                      <Route path="gigs" element={<GigMarketplacePage />} />
                      <Route path="verify" element={<ProtectedRoute><ArtistVerificationPage /></ProtectedRoute>} />
                      <Route path="smart-playlists" element={<ProtectedRoute><SmartPlaylistsPage /></ProtectedRoute>} />
                      <Route path="artist/:id" element={<ArtistPage />} />
                      <Route path="artist/:id/edit" element={<ProtectedRoute><ArtistPageEditor /></ProtectedRoute>} />
                      <Route path="artist/:id/edit/advanced" element={<ProtectedRoute><ArtistPageEditorAdvanced /></ProtectedRoute>} />
                      <Route path="feed" element={<ProtectedRoute><MusicFeedPage /></ProtectedRoute>} />
                      <Route path="track/:id/insights" element={<ProtectedRoute><TrackInsightsPage /></ProtectedRoute>} />
                    </Route>

                    {/* Public social creator page (Instagram-style + portfolio fused) */}
                    <Route path="/@:slug" element={<SocialCreatorPage />} />
                    {/* Dedicated artist showcase pages (must precede /:username catch-all) */}
                    <Route path="/arya" element={<AryaXO />} />
                    <Route path="/aryaxo" element={<AryaXO />} />
                    <Route path="/arya-xo" element={<AryaXO />} />
                    <Route path="/arya-xo/links" element={<AryaXO />} />
                    <Route path="/arya-xo-links" element={<AryaXO />} />
                    <Route path="/arya-xo-site" element={<AryaXOSite />} />
                    <Route path="/arya-xo/blog" element={<AryaXOBlog />} />
                    <Route path="/arya-xo-blog" element={<AryaXOBlog />} />
                    <Route path="/arya-xo/blog/150-bands" element={<AryaXOBlog />} />
                    {/* Roster artists — driven by src/data/artistRoster.ts */}
                    {(["omid", "omid-music", "omidmusic", "morvarid", "morvarid-shahbazi", "morvaridshahbazi", "andy", "andy-music", "andymusic1"]).map((s) => (
                      <Route key={s} path={`/${s}`} element={<ArtistLinkRoute />} />
                    ))}
                    {(["omid", "morvarid", "andy"]).map((s) => (
                      <Route key={`${s}-site`} path={`/${s}-site`} element={<ArtistSiteRoute />} />
                    ))}
                    <Route path="/blog" element={<UplyBlog />} />
                    <Route path="/blog/:slug" element={<UplyBlogPost />} />
                    <Route path="/admin/booking-inquiries" element={<AdminBookingInquiries />} />
                    {/* Onboarding & Waitlist (auth required but no approval needed) */}
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/apply" element={<Apply />} />
                    <Route path="/waitlist" element={<WaitlistPage />} />
                    <Route path="/founders" element={<Founders />} />

                    {/* Protected routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/grow" element={<ProtectedRoute><Grow /></ProtectedRoute>} />
                    <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                    <Route path="/affiliates" element={<ProtectedRoute><Affiliates /></ProtectedRoute>} />
                    <Route path="/creator-affiliate" element={<ProtectedRoute><CreatorAffiliate /></ProtectedRoute>} />
                    <Route path="/collaborate" element={<ProtectedRoute><Collaborate /></ProtectedRoute>} />
                    <Route path="/collaborate/product" element={<ProtectedRoute><JointProduct /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/settings/connections" element={<ProtectedRoute><SettingsConnections /></ProtectedRoute>} />
                    <Route path="/my-rep" element={<ProtectedRoute><MyRep /></ProtectedRoute>} />
                    <Route path="/go-live" element={<ProtectedRoute><GoLive /></ProtectedRoute>} />
                    <Route path="/buy-credits" element={<ProtectedRoute><BuyCredits /></ProtectedRoute>} />
                    <Route path="/ad-integrations" element={<ProtectedRoute><AdIntegrations /></ProtectedRoute>} />
                    <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
                    <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
                    <Route path="/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
                    <Route path="/talent-profile" element={<ProtectedRoute><TalentProfile /></ProtectedRoute>} />
                    <Route path="/job-messages" element={<ProtectedRoute><JobMessages /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                    <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
                    <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
                    <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
                    <Route path="/playlist/:id" element={<PlaylistDetail />} />
                    <Route path="/boost-success" element={<BoostSuccess />} />
                    <Route path="/boost-cancel" element={<BoostCancel />} />
                    <Route path="/content-library" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
                    <Route path="/launchpad" element={<ProtectedRoute><Launchpad /></ProtectedRoute>} />
                    <Route path="/growth-reports" element={<ProtectedRoute><GrowthReports /></ProtectedRoute>} />
                   <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                   <Route path="/trending" element={<Trending />} />
                   <Route path="/for-you" element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
                   <Route path="/following" element={<ProtectedRoute><Following /></ProtectedRoute>} />
                   <Route path="/new" element={<NewCreators />} />
                   <Route path="/c/:category" element={<CategoryFeed />} />
                    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                    <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
                    <Route path="/scan" element={<ProtectedRoute><Scan /></ProtectedRoute>} />
                    <Route path="/scan/:eventId" element={<ProtectedRoute><ScanEvent /></ProtectedRoute>} />
                    <Route path="/events/:eventId/live" element={<ProtectedRoute><EventCommandCenter /></ProtectedRoute>} />
                    <Route path="/events/:eventId/watch" element={<ProtectedRoute><EventLiveStream /></ProtectedRoute>} />
                    <Route path="/repurpose" element={<ProtectedRoute><Repurpose /></ProtectedRoute>} />
                    <Route path="/events/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
                    <Route path="/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
                    <Route path="/events/global/:eventId" element={<GlobalEventDetail />} />
                    <Route path="/events/:slug" element={<EventPage />} />
                    <Route path="/invite-codes" element={<ProtectedRoute><InviteCodes /></ProtectedRoute>} />
                    <Route path="/dashboard/content-studio" element={<ProtectedRoute><ContentStudio /></ProtectedRoute>} />
                    <Route path="/dashboard/ai-team" element={<ProtectedRoute><AITeamDashboard /></ProtectedRoute>} />
                    <Route path="/aria-command" element={<ProtectedRoute><AriaCommandPage /></ProtectedRoute>} />
                    <Route path="/aria/growth-assistant" element={<ProtectedRoute><GrowthAssistant /></ProtectedRoute>} />
                    <Route path="/newsletter" element={<ProtectedRoute><Newsletter /></ProtectedRoute>} />
                    <Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
                    <Route path="/my-page/funnel/:pageId" element={<ProtectedRoute><FunnelEditor /></ProtectedRoute>} />
                    <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
                    <Route path="/marketplace/deal/:dealId" element={<ProtectedRoute><BrandDeal /></ProtectedRoute>} />
                    <Route path="/podcast" element={<ProtectedRoute><Podcast /></ProtectedRoute>} />
                    <Route path="/podcast-rss" element={<ProtectedRoute><PodcastRSS /></ProtectedRoute>} />
                    <Route path="/network" element={<ProtectedRoute><NetworkFeed /></ProtectedRoute>} />
                    <Route path="/distribution" element={<ProtectedRoute><Distribution /></ProtectedRoute>} />
                    <Route path="/ads" element={<ProtectedRoute><AdsHub /></ProtectedRoute>} />
                    <Route path="/developer" element={<ProtectedRoute><DeveloperAPI /></ProtectedRoute>} />
                    <Route path="/dashboard/subscribers" element={<ProtectedRoute><Subscribers /></ProtectedRoute>} />
                    <Route path="/dashboard/broadcast" element={<ProtectedRoute><EmailBroadcast /></ProtectedRoute>} />
                    <Route path="/dashboard/email-analytics" element={<ProtectedRoute><EmailAnalytics /></ProtectedRoute>} />
                    <Route path="/dashboard/drip-sequences" element={<ProtectedRoute><DripSequences /></ProtectedRoute>} />

                    {/* Admin routes */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
                    <Route path="/admin/payouts" element={<AdminRoute><AdminPayouts /></AdminRoute>} />
                    <Route path="/admin/features" element={<AdminRoute><AdminFeatureToggles /></AdminRoute>} />
                    <Route path="/admin/affiliates" element={<AdminRoute><AdminAffiliates /></AdminRoute>} />
                    <Route path="/admin/referrals" element={<AdminRoute><AdminReferrals /></AdminRoute>} />
                    <Route path="/admin/tv-audit" element={<AdminRoute><AdminTVAudit /></AdminRoute>} />
                    <Route path="/admin/event-fees" element={<AdminRoute><AdminEventFees /></AdminRoute>} />

                    {/* In-app camera & post-capture editors */}
                    <Route path="/camera" element={<ProtectedRoute><Camera /></ProtectedRoute>} />
                    <Route path="/create/post/editor" element={<ProtectedRoute><PostEditor /></ProtectedRoute>} />
                    <Route path="/create/story/editor" element={<ProtectedRoute><StoryEditor /></ProtectedRoute>} />
                    <Route path="/create/short/editor" element={<ProtectedRoute><ShortEditor /></ProtectedRoute>} />
                    <Route path="/create/video/editor" element={<ProtectedRoute><VideoEditorPage /></ProtectedRoute>} />

                    {/* Legacy /:username and /:username/page redirect to /@<slug>; keep last before 404. */}
                    <Route path="/:username/page" element={<UsernameRedirect />} />
                    <Route path="/:username" element={<UsernameRedirect />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </RouteErrorBoundary>
                </Suspense>
                </ErrorBoundary>
                <PersistentPlayerGate />
              </BrowserRouter>
              </AppWithSplash>
              </NativeShell>
              </CartProvider>
              </NetworkProvider>
            </FeatureProvider>
          </AppProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
