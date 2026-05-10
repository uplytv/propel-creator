import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useMySplitSheets,
  useCreateSheet,
  useSheetWriters,
  useAddWriter,
  useUpdateSheetStatus,
} from "../hooks/useSplitSheets";
import { SplitWriterRow } from "../components/SplitWriterRow";
import { toast } from "sonner";

export default function SplitSheetsPage() {
  const sheets = useMySplitSheets();
  const create = useCreateSheet();
  const updateStatus = useUpdateSheetStatus();

  const [newSheet, setNewSheet] = useState({ song_title: "", work_title: "", notes: "" });
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  const writers = useSheetWriters(activeSheet ?? undefined);
  const addWriter = useAddWriter();
  const [writerForm, setWriterForm] = useState({
    writer_name: "",
    writer_email: "",
    role: "writer",
    writing_share_pct: 50,
    publishing_share_pct: 50,
    pro_affiliation: "",
  });

  const totalWriting = writers.data?.reduce((s, w) => s + Number(w.writing_share_pct), 0) ?? 0;
  const totalPublishing =
    writers.data?.reduce((s, w) => s + Number(w.publishing_share_pct), 0) ?? 0;

  const submitSheet = async () => {
    if (!newSheet.song_title) return toast.error("Song title required");
    try {
      const created = await create.mutateAsync(newSheet);
      toast.success("Split sheet created");
      setNewSheet({ song_title: "", work_title: "", notes: "" });
      setActiveSheet(created.id);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const submitWriter = async () => {
    if (!activeSheet || !writerForm.writer_name) return;
    try {
      await addWriter.mutateAsync({ sheet_id: activeSheet, ...writerForm });
      setWriterForm({ ...writerForm, writer_name: "", writer_email: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="container mx-auto p-4 mobile-safe-content">
      <h1 className="text-2xl font-bold mb-1">Split Sheets</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Document co-writes and royalty splits between writers, composers, and producers.
      </p>

      <Card className="p-4 space-y-3 mb-6">
        <h2 className="font-semibold">New split sheet</h2>
        <div>
          <Label>Song title</Label>
          <Input
            value={newSheet.song_title}
            onChange={(e) => setNewSheet({ ...newSheet, song_title: e.target.value })}
          />
        </div>
        <div>
          <Label>Work title (optional)</Label>
          <Input
            value={newSheet.work_title}
            onChange={(e) => setNewSheet({ ...newSheet, work_title: e.target.value })}
          />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea
            value={newSheet.notes}
            onChange={(e) => setNewSheet({ ...newSheet, notes: e.target.value })}
          />
        </div>
        <Button onClick={submitSheet} disabled={create.isPending} className="w-full">
          Create sheet
        </Button>
      </Card>

      <div className="space-y-3 mb-6">
        <h2 className="font-semibold">Your sheets</h2>
        {sheets.data?.map((s) => (
          <Card
            key={s.id}
            className={`p-3 cursor-pointer ${activeSheet === s.id ? "border-primary" : ""}`}
            onClick={() => setActiveSheet(s.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{s.song_title}</p>
                <p className="text-xs text-muted-foreground">{s.work_title}</p>
              </div>
              <Badge className="capitalize">{s.status}</Badge>
            </div>
          </Card>
        ))}
        {sheets.data?.length === 0 && (
          <p className="text-center text-muted-foreground py-4">No split sheets yet</p>
        )}
      </div>

      {activeSheet && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Writers & splits</h2>
            <div className="flex gap-2 text-sm">
              <Badge variant={totalWriting === 100 ? "default" : "destructive"}>
                Writing: {totalWriting}%
              </Badge>
              <Badge variant={totalPublishing === 100 ? "default" : "destructive"}>
                Publishing: {totalPublishing}%
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            {writers.data?.map((w) => <SplitWriterRow key={w.id} writer={w} />)}
          </div>

          <div className="space-y-2 border-t pt-4">
            <h3 className="font-semibold text-sm">Add writer</h3>
            <Input
              placeholder="Writer name"
              value={writerForm.writer_name}
              onChange={(e) => setWriterForm({ ...writerForm, writer_name: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={writerForm.writer_email}
              onChange={(e) => setWriterForm({ ...writerForm, writer_email: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={writerForm.role}
                onChange={(e) => setWriterForm({ ...writerForm, role: e.target.value })}
              >
                <option value="writer">Writer</option>
                <option value="composer">Composer</option>
                <option value="lyricist">Lyricist</option>
                <option value="producer">Producer</option>
              </select>
              <Input
                placeholder="PRO (ASCAP, BMI...)"
                value={writerForm.pro_affiliation}
                onChange={(e) => setWriterForm({ ...writerForm, pro_affiliation: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Writing %</Label>
                <Input
                  type="number"
                  value={writerForm.writing_share_pct}
                  onChange={(e) =>
                    setWriterForm({ ...writerForm, writing_share_pct: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Publishing %</Label>
                <Input
                  type="number"
                  value={writerForm.publishing_share_pct}
                  onChange={(e) =>
                    setWriterForm({
                      ...writerForm,
                      publishing_share_pct: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <Button onClick={submitWriter} className="w-full" disabled={addWriter.isPending}>
              Add writer
            </Button>
          </div>

          <div className="flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => updateStatus.mutate({ id: activeSheet, status: "pending" })}
            >
              Send for signature
            </Button>
            <Button
              className="flex-1"
              onClick={() => updateStatus.mutate({ id: activeSheet, status: "signed" })}
              disabled={totalWriting !== 100 || totalPublishing !== 100}
            >
              Mark signed
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
