import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function PushNotificationPermission() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "default") return;
    if (sessionStorage.getItem("uply_push_prompted") === "1") return;

    // Show after a short delay to not overwhelm
    const timer = setTimeout(() => setShow(true), 8000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleEnable = async () => {
    sessionStorage.setItem("uply_push_prompted", "1");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) { setShow(false); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });
        const subJson = sub.toJSON();
        await supabase.from("push_subscriptions").upsert({
          user_id: user!.id,
          endpoint: subJson.endpoint!,
          p256dh: subJson.keys!.p256dh,
          auth_key: subJson.keys!.auth,
          user_agent: navigator.userAgent,
        }, { onConflict: "user_id,endpoint" });
      }
    } catch (e) {
      console.error("Push subscription failed:", e);
    }
    setShow(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("uply_push_prompted", "1");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">🔔 Never miss a live stream</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get notified when your favorites go live.</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleEnable}>Enable Notifications</Button>
                  <Button size="sm" variant="ghost" onClick={handleDismiss}>Maybe later</Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
