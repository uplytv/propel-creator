import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { FeatureProvider } from "@/context/FeatureContext";
import TierCelebration from "@/components/TierCelebration";
import ProtectedRoute from "@/components/ProtectedRoute";
import LaunchGate from "@/components/LaunchGate";
import AdminRoute from "./components/AdminRoute";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const MyRep = lazy(() => import("./pages/MyRep"));
const Grow = lazy(() => import("./pages/Grow"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const Settings = lazy(() => import("./pages/Settings"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Collaborate = lazy(() => import("./pages/Collaborate"));
const JointProduct = lazy(() => import("./pages/JointProduct"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Live = lazy(() => import("./pages/Live"));
const Stream = lazy(() => import("./pages/Stream"));
const GoLive = lazy(() => import("./pages/GoLive"));
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
const AdminPayouts = lazy(() => import("./pages/AdminPayouts"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminFeatureToggles = lazy(() => import("./pages/AdminFeatureToggles"));
const ContentLibrary = lazy(() => import("./pages/ContentLibrary"));
const CreatorSpace = lazy(() => import("./pages/CreatorSpace"));
const Launchpad = lazy(() => import("./pages/Launchpad"));
const AdminAffiliates = lazy(() => import("./pages/AdminAffiliates"));
const ReferralRedirect = lazy(() => import("./pages/ReferralRedirect"));
const GrowthReports = lazy(() => import("./pages/GrowthReports"));
const Shorts = lazy(() => import("./pages/Shorts"));
const SearchPage = lazy(() => import("./pages/Search"));
const Messages = lazy(() => import("./pages/Messages"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Pricing = lazy(() => import("./pages/Pricing"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <AppProvider>
            <FeatureProvider>
              <Toaster />
              <Sonner />
              <TierCelebration />
              <LaunchGate>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/p/:slug" element={<JointProduct isPublic />} />
                    <Route path="/live" element={<Live />} />
                    <Route path="/stream/:id" element={<Stream />} />
                    <Route path="/creator/:username/videos/:id" element={<Stream />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/ref/:code" element={<ReferralRedirect />} />
                    <Route path="/creator/:username" element={<CreatorProfile />} />
                    <Route path="/community/:creatorId" element={<CreatorSpace />} />
                    <Route path="/community/:creatorId/:tab" element={<CreatorSpace />} />
                    <Route path="/space/:creatorId" element={<CreatorSpace />} />
                    <Route path="/space/:creatorId/:tab" element={<CreatorSpace />} />
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/shorts" element={<Shorts />} />
                    <Route path="/pricing" element={<Pricing />} />

                    {/* Protected routes */}
                    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/grow" element={<ProtectedRoute><Grow /></ProtectedRoute>} />
                    <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                    <Route path="/affiliates" element={<ProtectedRoute><Affiliates /></ProtectedRoute>} />
                    <Route path="/collaborate" element={<ProtectedRoute><Collaborate /></ProtectedRoute>} />
                    <Route path="/collaborate/product" element={<ProtectedRoute><JointProduct /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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
                    <Route path="/content-library" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
                    <Route path="/launchpad" element={<ProtectedRoute><Launchpad /></ProtectedRoute>} />
                    <Route path="/growth-reports" element={<ProtectedRoute><GrowthReports /></ProtectedRoute>} />
                    <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                    <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

                    {/* Admin routes */}
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                    <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
                    <Route path="/admin/payouts" element={<AdminRoute><AdminPayouts /></AdminRoute>} />
                    <Route path="/admin/features" element={<AdminRoute><AdminFeatureToggles /></AdminRoute>} />
                    <Route path="/admin/affiliates" element={<AdminRoute><AdminAffiliates /></AdminRoute>} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              </LaunchGate>
            </FeatureProvider>
          </AppProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
