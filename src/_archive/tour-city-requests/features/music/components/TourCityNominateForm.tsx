import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNominateTourCity } from "../hooks/useTourCityRequests";
import { toast } from "sonner";

interface Props {
  artistId: string;
  onNominated?: () => void;
}

export function TourCityNominateForm({ artistId, onNominated }: Props) {
  const nominate = useNominateTourCity();
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !country.trim()) {
      toast.error("City and country are required");
      return;
    }
    try {
      await nominate.mutateAsync({
        artist_id: artistId,
        city: city.trim(),
        country: country.trim(),
        region: region.trim() || undefined,
      });
      toast.success("City nominated!");
      setCity("");
      setRegion("");
      setCountry("");
      onNominated?.();
    } catch (err: any) {
      const msg = err?.message?.includes("duplicate")
        ? "Someone already nominated this city — vote for it instead!"
        : err?.message ?? "Failed to nominate";
      toast.error(msg);
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="tour-city">City</Label>
          <Input
            id="tour-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Berlin"
            className="text-base min-h-[44px]"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tour-region">Region (opt.)</Label>
            <Input
              id="tour-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Berlin"
              className="text-base min-h-[44px]"
            />
          </div>
          <div>
            <Label htmlFor="tour-country">Country</Label>
            <Input
              id="tour-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Germany"
              className="text-base min-h-[44px]"
              required
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={nominate.isPending}
          className="w-full min-h-[44px]"
        >
          {nominate.isPending ? "Nominating..." : "Nominate city"}
        </Button>
      </form>
    </Card>
  );
}
