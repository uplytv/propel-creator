import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDiscoveryAlgorithmFeed } from "@/hooks/useDiscoveryAlgorithmFeed";
import DiscoveryGrid from "@/components/discovery/DiscoveryGrid";

function prettify(slug: string) {
  return slug.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

export default function CategoryFeed() {
  const { category = "" } = useParams();
  const display = prettify(category);
  const { data: items = [], isLoading } = useDiscoveryAlgorithmFeed("for-you", display);
  useEffect(() => { document.title = `${display} — UPLY`; }, [display]);

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">{display}</h1>
        <p className="text-sm text-muted-foreground">Trending in {display} right now.</p>
      </header>
      <DiscoveryGrid items={items} isLoading={isLoading} emptyMessage={`No ${display} content yet.`} />
    </div>
  );
}
