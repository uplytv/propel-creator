import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { useSubmitDemo } from "../hooks/useDemoInbox";

interface Props {
  artistId: string;
  onSubmitted?: () => void;
}

export function DemoSubmissionForm({ artistId, onSubmitted }: Props) {
  const [title, setTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const submit = useSubmitDemo();

  return (
    <div className="space-y-3">
      <Input
        placeholder="Demo title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        className="text-base"
      />
      <Input
        placeholder="Audio URL"
        value={audioUrl}
        onChange={(e) => setAudioUrl(e.target.value)}
        className="text-base"
      />
      <Input
        placeholder="Genre (optional)"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        maxLength={40}
        className="text-base"
      />
      <Textarea
        placeholder="Tell the artist about your demo (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
        className="text-base"
      />
      <Button
        className="w-full min-h-[44px]"
        disabled={!title || !audioUrl || submit.isPending}
        onClick={() => {
          submit.mutate(
            {
              artist_id: artistId,
              title: title.trim(),
              audio_url: audioUrl.trim(),
              genre: genre.trim() || undefined,
              description: description.trim() || undefined,
            },
            {
              onSuccess: () => {
                setTitle("");
                setAudioUrl("");
                setGenre("");
                setDescription("");
                onSubmitted?.();
              },
            }
          );
        }}
      >
        {submit.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Submit Demo
      </Button>
    </div>
  );
}
