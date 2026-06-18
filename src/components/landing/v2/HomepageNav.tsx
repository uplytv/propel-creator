import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export default function HomepageNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-border/40"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
        <Link to="/" className="flex items-center" aria-label="UPLY home">
          <img src={logo} alt="UPLY" className="h-10 w-10 rounded-md" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground">
              Sign In
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
