import { useState } from "react";
import { useGigListings } from "../hooks/useGigMarketplace";
import { GigListingCard } from "../components/GigListingCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function GigMarketplacePage() {
  const [gigType, setGigType] = useState<string>("");
  const [city, setCity] = useState("");
  const { data = [], isLoading } = useGigListings({ gigType: gigType || undefined, city: city || undefined });

  return (
    <div className="min-h-screen bg-background mobile-safe-content max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold mb-1">Gigs marketplace</h1>
      <p className="text-sm text-muted-foreground mb-4">Hire musicians, DJs and bands for your event.</p>

      <Tabs value={gigType || "all"} onValueChange={(v) => setGigType(v === "all" ? "" : v)} className="mb-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="dj">DJ</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="virtual">Virtual</TabsTrigger>
        </TabsList>
      </Tabs>

      <Input
        placeholder="Filter by city"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="mb-4"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No artists match your filters yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.map((l) => (
            <GigListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
