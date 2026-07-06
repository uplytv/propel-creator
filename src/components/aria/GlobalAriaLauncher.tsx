import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Bot, X } from "lucide-react";
import { AriaPanel } from "./AriaPanel";
import { useAuth } from "@/context/AuthContext";

/**
 * Globally-mounted floating ARIA button. Available on every authenticated
 * page so creators can pull up the AI co-pilot from anywhere — chat, ideas,
 * growth advice, contextual help on the current screen.
 *
 * Hidden on:
 *  - unauthenticated routes (no /auth, /onboarding, /waitlist clutter)
 *  - live broadcast / camera routes where overlays would block the UI
 *  - the dedicated /aria-command page (already an ARIA surface)
 */
const HIDE_PREFIXES = [
  "/auth",
  "/onboarding",
  "/waitlist",
  "/pending-approval",
  "/reset-password",
  "/email-unsubscribe",
  "/unsubscribe",
  "/go-live",
  "/camera",
  "/broadcast",
  "/dashboard/broadcast",
  "/stream/",
  "/aria-command",
  "/scan",
  "/privacy",
  "/terms",
];

export default function GlobalAriaLauncher() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Keyboard shortcut: ⌘/Ctrl + J opens ARIA from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!user) return null;
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open ARIA AI assistant (⌘J)"
        title="Ask ARIA  ·  ⌘J"
        className="fixed z-40 right-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] md:bottom-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white font-bold transition-transform hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-mid)) 100%)",
          boxShadow: "0 10px 30px hsl(var(--gradient-mid) / 0.35)",
          minWidth: 44,
          minHeight: 44,
        }}
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        <span className="sr-only">Ask ARIA</span>
      </button>
      <AriaPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
