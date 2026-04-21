import { Helmet } from "react-helmet-async";
import { Sparkles } from "lucide-react";
import { useDiscoveryAlgorithmFeed } from "@/hooks/useDiscoveryAlgorithmFeed";
import DiscoveryGrid from "@/components/discovery/DiscoveryGrid";

export default function NewCreators() {
  const { data: items = [], isLoading } = useDiscoveryAlgorithmFeed("new");
  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <Helmet>
        <title>Rising Creators — UPLY</title>
        <meta name="description" content="Discover the newest creators on UPLY — guaranteed visibility from day one." />
        <link rel="canonical" href="https://uply.tv/new" />
      </Helmet>
      <header className="px-4 pt-6 pb-2 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rising Creators</h1>
          <p className="text-sm text-muted-foreground">Fresh voices getting their first audience on UPLY.</p>
        </div>
      </header>
      <DiscoveryGrid items={items} isLoading={isLoading} emptyMessage="No rising creators yet — be the first." />
    </div>
  );
}
