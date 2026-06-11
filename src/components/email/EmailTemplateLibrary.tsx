import { useState } from "react";
import { FileText, Copy, Search, Plus, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/email/RichTextEditor";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const categoryColors: Record<string, string> = {
  onboarding: "bg-blue-500/10 text-blue-400",
  marketing: "bg-purple-500/10 text-purple-400",
  events: "bg-yellow-500/10 text-yellow-400",
  transactional: "bg-primary/10 text-primary",
  retention: "bg-orange-500/10 text-orange-400",
  content: "bg-cyan-500/10 text-cyan-400",
  general: "bg-muted text-muted-foreground",
};

interface Props {
  onUseTemplate?: (subject: string, body: string) => void;
}

export default function EmailTemplateLibrary({ onUseTemplate }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_templates")
        .select("*")
        .or(`is_system.eq.true,creator_id.eq.${user!.id}`)
        .order("is_system", { ascending: false })
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const filtered = templates.filter(t => {
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_templates").insert({
        creator_id: user!.id,
        name: newName,
        category: newCategory,
        subject: newSubject,
        body: newBody,
        is_system: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template saved");
      setShowCreate(false);
      setNewName(""); setNewSubject(""); setNewBody("");
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });

  const categories = [...new Set(templates.map(t => t.category))].sort();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" /> Email Templates
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="h-7 px-2 text-xs rounded-lg gap-1">
          <Plus className="w-3 h-3" /> Create
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-xs rounded-lg" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">No templates found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => (
            <div key={t.id} className="p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{t.name}</span>
                  <Badge variant="outline" className={`${categoryColors[t.category] || categoryColors.general} text-[9px] px-1.5 py-0 shrink-0`}>
                    {t.category}
                  </Badge>
                  {t.is_system && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-accent/30 text-accent-foreground">System</Badge>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate mb-2">{t.subject}</p>
              <div className="flex gap-1.5">
                {onUseTemplate && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] rounded-md gap-1"
                    onClick={() => onUseTemplate(t.subject, t.body)}
                  >
                    <Copy className="w-3 h-3" /> Use
                  </Button>
                )}
                {!t.is_system && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] rounded-md text-destructive/60 hover:text-destructive gap-1"
                    onClick={() => { if (confirm("Delete template?")) deleteMutation.mutate(t.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Template name" className="rounded-xl" />
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
                <SelectItem value="retention">Retention</SelectItem>
                <SelectItem value="content">Content</SelectItem>
              </SelectContent>
            </Select>
            <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject line" className="rounded-xl" />
            <RichTextEditor value={newBody} onChange={setNewBody} placeholder="Email body..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || !newSubject.trim() || createMutation.isPending} style={{ background: "#3D7CFF", color: "#0A0A0A" }}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
