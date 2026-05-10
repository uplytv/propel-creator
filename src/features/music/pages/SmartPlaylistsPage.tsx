import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSmartPlaylists,
  useCreateSmartPlaylist,
  type SmartRuleType,
} from "../hooks/useSmartPlaylists";
import { SmartPlaylistCard } from "../components/SmartPlaylistCard";
import { toast } from "sonner";

export default function SmartPlaylistsPage() {
  const { data = [], isLoading } = useSmartPlaylists();
  const create = useCreateSmartPlaylist();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [ruleType, setRuleType] = useState<SmartRuleType>("liked");
  const [genre, setGenre] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    const params: Record<string, any> = {};
    if (ruleType === "genre") params.genre = genre.trim();
    try {
      await create.mutateAsync({ title: title.trim(), rule_type: ruleType, rule_params: params });
      toast.success("Smart playlist created");
      setOpen(false);
      setTitle("");
      setGenre("");
      setRuleType("liked");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create");
    }
  };

  return (
    <div className="mobile-safe-content px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Smart playlists
          </h1>
          <p className="text-sm text-muted-foreground">Auto-updating playlists driven by rules</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create smart playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Select value={ruleType} onValueChange={(v) => setRuleType(v as SmartRuleType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liked">Liked songs</SelectItem>
                  <SelectItem value="recently_played">Recently played</SelectItem>
                  <SelectItem value="top_played">Top played</SelectItem>
                  <SelectItem value="genre">By genre</SelectItem>
                </SelectContent>
              </Select>
              {ruleType === "genre" && (
                <Input
                  placeholder="Genre (e.g. hip-hop)"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                />
              )}
              <Button onClick={submit} disabled={create.isPending} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No smart playlists yet. Create your first to auto-fill it.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {data.map((p) => (
            <SmartPlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      )}
    </div>
  );
}
