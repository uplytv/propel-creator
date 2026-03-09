import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import TierCelebration from "@/components/TierCelebration";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Community from "./pages/Community";
import MyRep from "./pages/MyRep";
import Grow from "./pages/Grow";
import Affiliates from "./pages/Affiliates";
import Settings from "./pages/Settings";
import Leaderboard from "./pages/Leaderboard";
import Collaborate from "./pages/Collaborate";
import JointProduct from "./pages/JointProduct";
import NotFound from "./pages/NotFound";
import Live from "./pages/Live";
import Stream from "./pages/Stream";
import GoLive from "./pages/GoLive";
import BuyCredits from "./pages/BuyCredits";
import AdIntegrations from "./pages/AdIntegrations";
import Jobs from "./pages/Jobs";
import PostJob from "./pages/PostJob";
import JobDetail from "./pages/JobDetail";
import TalentProfile from "./pages/TalentProfile";
import JobMessages from "./pages/JobMessages";
import Notifications from "./pages/Notifications";
import CreatorProfile from "./pages/CreatorProfile";
import Discover from "./pages/Discover";
import Wallet from "./pages/Wallet";
import AdminPayouts from "./pages/AdminPayouts";
import ContentLibrary from "./pages/ContentLibrary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <AppProvider>
            <Toaster />
            <Sonner />
            <TierCelebration />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/p/:slug" element={<JointProduct isPublic />} />
                <Route path="/live" element={<Live />} />
                <Route path="/stream/:id" element={<Stream />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/creator/:username" element={<CreatorProfile />} />
                <Route path="/discover" element={<Discover />} />

                {/* Protected routes */}
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/grow" element={<ProtectedRoute><Grow /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
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
                <Route path="/admin/payouts" element={<ProtectedRoute><AdminPayouts /></ProtectedRoute>} />
                <Route path="/content-library" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
