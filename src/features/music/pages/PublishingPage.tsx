import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useMyPublishingRegistrations, useUpsertRegistration } from "../hooks/usePublishing";
import { PublishingRegistrationCard } from "../components/PublishingRegistrationCard";
import { toast } from "@/hooks/use-toast";

export default function PublishingPage() {
  const { data: regs = [], isLoading } = useMyPublishingRegistrations();
  const upsert = useUpsertRegistration();
  const [form, setForm] = useState({ isrc: "", upc: "", iswc: "", pro_name: "", pro_member_id: "", publisher_name: "", writer_share: "" });

  const onSubmit = async () => {
    try {
      await upsert.mutateAsync({
        isrc: form.isrc || null,
        upc: form.upc || null,
        iswc: form.iswc || null,
        pro_name: form.pro_name || null,
        pro_member_id: form.pro_member_id || null,
        publisher_name: form.publisher_name || null,
        writer_share: form.writer_share ? Number(form.writer_share) : null,
        status: "pending",
      });
      setForm({ isrc: "", upc: "", iswc: "", pro_name: "", pro_member_id: "", publisher_name: "", writer_share: "" });
      toast({ title: "Registration saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-4 mobile-safe-content space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Publishing & Metadata</h1>
        <p className="text-sm text-muted-foreground">Track ISRC, UPC, ISWC and PRO registrations.</p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">New registration</h2>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="ISRC" value={form.isrc} onChange={e => setForm({ ...form, isrc: e.target.value })} />
          <Input placeholder="UPC" value={form.upc} onChange={e => setForm({ ...form, upc: e.target.value })} />
          <Input placeholder="ISWC" value={form.iswc} onChange={e => setForm({ ...form, iswc: e.target.value })} />
          <Input placeholder="PRO (ASCAP/BMI/...)" value={form.pro_name} onChange={e => setForm({ ...form, pro_name: e.target.value })} />
          <Input placeholder="PRO Member ID" value={form.pro_member_id} onChange={e => setForm({ ...form, pro_member_id: e.target.value })} />
          <Input placeholder="Publisher" value={form.publisher_name} onChange={e => setForm({ ...form, publisher_name: e.target.value })} />
          <Input placeholder="Writer share %" type="number" value={form.writer_share} onChange={e => setForm({ ...form, writer_share: e.target.value })} />
        </div>
        <Button onClick={onSubmit} disabled={upsert.isPending} className="w-full">
          {upsert.isPending ? "Saving..." : "Save registration"}
        </Button>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">My registrations</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && regs.length === 0 && <p className="text-sm text-muted-foreground">No registrations yet.</p>}
        {regs.map(r => <PublishingRegistrationCard key={r.id} reg={r} />)}
      </div>
    </div>
  );
}
