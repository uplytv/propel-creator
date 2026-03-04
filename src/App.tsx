import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";
import TierCelebration from "@/components/TierCelebration";
import Landing from "./pages/Landing";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <TierCelebration />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/grow" element={<Grow />} />
              <Route path="/products" element={<Products />} />
              <Route path="/community" element={<Community />} />
              <Route path="/affiliates" element={<Affiliates />} />
              <Route path="/collaborate" element={<Collaborate />} />
              <Route path="/collaborate/product" element={<JointProduct />} />
              <Route path="/p/:slug" element={<JointProduct isPublic />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/my-rep" element={<MyRep />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
