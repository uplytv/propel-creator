import { useState, useRef } from "react";
import { Upload, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CSVImport({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ email: string; name?: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV needs at least a header and one row"); return; }

      const header = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
      const emailIdx = header.findIndex(h => h === "email" || h === "e-mail" || h === "email address");
      const nameIdx = header.findIndex(h => h === "name" || h === "full name" || h === "first name");

      if (emailIdx === -1) { toast.error("No 'email' column found in CSV"); return; }

      const rows: { email: string; name?: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const email = cols[emailIdx]?.trim().toLowerCase();
        if (!email || !email.includes("@")) continue;
        const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : undefined;
        rows.push({ email, name: name || undefined });
      }
      setParsed(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!user || !parsed.length) return;
    setImporting(true);
    let imported = 0;
    let skipped = 0;

    // Batch upsert in chunks of 50
    for (let i = 0; i < parsed.length; i += 50) {
      const batch = parsed.slice(i, i + 50).map(r => ({
        creator_id: user.id,
        email: r.email,
        name: r.name || null,
        source: "csv_import" as string,
      }));

      const { error } = await supabase
        .from("subscribers")
        .upsert(batch, { onConflict: "creator_id,email", ignoreDuplicates: true });

      if (error) {
        skipped += batch.length;
      } else {
        imported += batch.length;
      }
    }

    setResult({ imported, skipped });
    setImporting(false);
    qc.invalidateQueries({ queryKey: ["subscribers"] });
    qc.invalidateQueries({ queryKey: ["subscriber-stats"] });
    toast.success(`Imported ${imported} subscribers`);
  };

  const reset = () => {
    setParsed([]);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Subscribers from CSV</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="text-center py-6 space-y-3">
            <Check className="w-12 h-12 mx-auto" style={{ color: "#3D7CFF" }} />
            <p className="text-sm font-medium text-foreground">{result.imported} subscribers imported</p>
            {result.skipped > 0 && (
              <p className="text-xs text-muted-foreground">{result.skipped} skipped (duplicates or errors)</p>
            )}
            <Button variant="outline" onClick={reset} className="rounded-xl">Import Another</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Upload a CSV file with at least an <strong>email</strong> column.</p>
              <p>Optional columns: <strong>name</strong>, <strong>full name</strong>, <strong>first name</strong></p>
            </div>

            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />

            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl gap-2 h-20 border-dashed"
            >
              {fileName ? (
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{parsed.length} valid emails found</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Choose CSV file</span>
                </div>
              )}
            </Button>

            {parsed.length > 0 && (
              <div className="p-3 rounded-xl bg-muted text-xs space-y-1 max-h-32 overflow-y-auto">
                <p className="font-medium text-foreground">Preview (first 5):</p>
                {parsed.slice(0, 5).map((r, i) => (
                  <p key={i} className="text-muted-foreground">{r.email}{r.name ? ` — ${r.name}` : ""}</p>
                ))}
                {parsed.length > 5 && <p className="text-muted-foreground/60">...and {parsed.length - 5} more</p>}
              </div>
            )}
          </div>
        )}

        {!result && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={!parsed.length || importing}
              style={{ background: "#3D7CFF", color: "#0A0A0A" }}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : `Import ${parsed.length}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { result.push(current); current = ""; continue; }
    current += c;
  }
  result.push(current);
  return result;
}
