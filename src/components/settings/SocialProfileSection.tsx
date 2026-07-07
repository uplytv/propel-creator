import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

const MUSIC_OPTIONS = [
  "House", "Techno", "Hip-Hop", "R&B", "Pop", "Latin", "EDM", "Jazz", "Rock", "Country", "Other",
];

export default function SocialProfileSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: socialProfile } = useQuery({
    queryKey: ["social-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("age, interests, show_in_people, location_sharing_enabled, people_photos")
        .eq("user_id", user.id)
        .single();
      return data as {
        age: number | null;
        interests: string[];
        show_in_people: boolean;
        location_sharing_enabled: boolean;
        people_photos: string[];
      } | null;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const [age, setAge] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [showInPeople, setShowInPeople] = useState(true);
  const [locationSharing, setLocationSharing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (socialProfile) {
      setAge(socialProfile.age?.toString() || "");
      setInterests(socialProfile.interests || []);
      setShowInPeople(socialProfile.show_in_people ?? true);
      setLocationSharing(socialProfile.location_sharing_enabled ?? false);
    }
  }, [socialProfile]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          age: age ? parseInt(age) : null,
          interests,
          show_in_people: showInPeople,
          location_sharing_enabled: locationSharing,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["social-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Social profile saved ✓");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-xl">👥</span>
        <h2 className="text-lg font-semibold text-foreground">Social Profile</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        These settings control how you appear in the People tab and social features.
      </p>

      {/* Age */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Age</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Your age"
          min={18}
          max={99}
          className="w-32 rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Music Interests */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Music Interests</label>
        <div className="flex flex-wrap gap-2">
          {MUSIC_OPTIONS.map((option) => {
            const isSelected = interests.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleInterest(option)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: isSelected ? "rgba(61, 124, 255,0.15)" : "rgba(255,255,255,0.06)",
                  color: isSelected ? "#3D7CFF" : "rgba(255,255,255,0.6)",
                  border: `1px solid ${isSelected ? "rgba(61, 124, 255,0.3)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Show in People toggle */}
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-foreground">Show me in People tab</p>
          <p className="text-xs text-muted-foreground">Let others discover you via swipe</p>
        </div>
        <Switch checked={showInPeople} onCheckedChange={setShowInPeople} />
      </div>

      {/* Location sharing toggle */}
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm font-medium text-foreground">Share My Location</p>
          <p className="text-xs text-muted-foreground">
            {locationSharing ? "Location active — sharing with friends" : "Share your location with friends nearby"}
          </p>
        </div>
        <Switch checked={locationSharing} onCheckedChange={setLocationSharing} />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
        style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save Social Profile
      </button>
    </div>
  );
}
