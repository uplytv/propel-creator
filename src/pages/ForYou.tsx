import { useEffect } from "react";
import { useDiscoveryAlgorithmFeed } from "@/hooks/useDiscoveryAlgorithmFeed";
import DiscoveryGrid from "@/components/discovery/DiscoveryGrid";

export default function ForYou() {
  const { data: items = [], isLoading } = useDiscoveryAlgorithmFeed("for-you");
  useEffect(() => { document.title = "For You — UPLY Discovery"; }, []);
  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">For You</h1>
        <p className="text-sm text-muted-foreground">Personalized to what you watch.</p>
      </header>
      <DiscoveryGrid items={items} isLoading={isLoading} emptyMessage="Watch a few streams to personalize your feed." />
    </div>
  );
}
