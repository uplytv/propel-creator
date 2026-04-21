import { Helmet } from "react-helmet-async";
import { useDiscoveryAlgorithmFeed } from "@/hooks/useDiscoveryAlgorithmFeed";
import DiscoveryGrid from "@/components/discovery/DiscoveryGrid";

export default function Following() {
  const { data: items = [], isLoading } = useDiscoveryAlgorithmFeed("following");
  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <Helmet>
        <title>Following — UPLY</title>
        <meta name="description" content="Latest content from creators you follow on UPLY." />
        <link rel="canonical" href="https://uply.tv/following" />
      </Helmet>
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Following</h1>
        <p className="text-sm text-muted-foreground">Fresh from creators you follow.</p>
      </header>
      <DiscoveryGrid items={items} isLoading={isLoading} emptyMessage="Follow some creators to see their content here." />
    </div>
  );
}
