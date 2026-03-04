import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Rocket, Package, Users, UserCheck, Bell, Lock, Share2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

const navItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Grow", icon: Rocket, path: "/grow" },
  { label: "Products", icon: Package, path: "/products" },
  { label: "Community", icon: Users, path: "/community" },
  { label: "Affiliates", icon: Share2, path: "/affiliates" },
  { label: "My Rep", icon: UserCheck, path: "/my-rep" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useApp();
  const isRepLocked = profile.tier <= 2;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/30 backdrop-blur-xl fixed inset-y-0 left-0 z-30">
        <div className="p-6">
          <span className="text-xl font-bold tracking-tight">PLATFORM</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const showLock = item.label === "My Rep" && isRepLocked;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span className="flex-1 text-left">{item.label}</span>
                {showLock && <Lock className="w-3.5 h-3.5 text-warning" />}
                {item.label === "My Rep" && !isRepLocked && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-4 mx-3 mb-4 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Tier {profile.tier}</span>
            <span className="text-sm font-semibold">{profile.tierName}</span>
          </div>
          {profile.tier < 3 && (
            <p className="text-[11px] text-muted-foreground mt-1">Upgrade to unlock your dedicated rep →</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 md:px-8 h-14">
            <span className="md:hidden text-lg font-bold">PLATFORM</span>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm font-medium">{profile.name}</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{profile.tierName}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
                <Bell className="w-[18px] h-[18px] text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {profile.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-xl z-30 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            const showLock = item.label === "My Rep" && isRepLocked;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 px-2 py-1 relative"
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {showLock && <Lock className="w-2.5 h-2.5 text-warning absolute -top-1 -right-1.5" />}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
