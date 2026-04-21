import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, Bell, ChevronDown } from "lucide-react";
import UplyLogo from "@/components/shared/UplyLogo";

const NAV_LINKS = [
  { label: "Home", to: "/home", active: true },
  { label: "Live", to: "/live" },
  { label: "Watch", to: "/discover" },
  { label: "Social", to: "/social" },
  { label: "Events", to: "/events" },
  { label: "Learn", to: "/learn" },
  { label: "My List", to: "/my-list" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center px-6 lg:px-12 transition-all duration-500 ${
        scrolled
          ? "bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/5"
          : "bg-gradient-to-b from-black/80 via-black/40 to-transparent"
      }`}
    >
      {/* Left */}
      <div className="flex items-center gap-8">
        <Link to="/home" className="flex items-center">
          <UplyLogo size={32} showWord />
        </Link>
        <ul className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <Link
                to={l.to}
                className={`text-[13px] font-medium transition-colors ${
                  l.active ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-2">
        <IconBtn label="Search"><Search className="w-[18px] h-[18px]" /></IconBtn>
        <IconBtn label="Discover"><Sparkles className="w-[18px] h-[18px]" /></IconBtn>
        <div className="relative">
          <IconBtn label="Notifications"><Bell className="w-[18px] h-[18px]" /></IconBtn>
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#00FF85] text-black text-[10px] font-bold flex items-center justify-center pointer-events-none">
            6
          </span>
        </div>
        <button
          className="ml-1 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85] rounded-md"
          aria-label="Account"
        >
          <div
            className="w-8 h-8 rounded-md bg-[#00FF85] flex items-center justify-center"
            style={{ boxShadow: "0 0 20px rgba(0,255,133,0.4)" }}
          >
            <UplyLogo size={22} color="#0A0A0A" />
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>
    </nav>
  );
}

function IconBtn({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF85]"
    >
      {children}
    </button>
  );
}
