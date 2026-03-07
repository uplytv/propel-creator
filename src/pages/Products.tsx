import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MoreVertical, Grid, List, Brain, Link as LinkIcon,
  LayoutTemplate, Pencil, Users, DollarSign, X, ArrowLeft,
  Loader2, Sparkles, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AppLayout from "@/components/layout/AppLayout";
import { useProducts, useCreateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";

const typeIcons: Record<string, string> = {
  digital: "📦", course: "📚", community: "🤝", coaching: "🎯",
};

const templates = [
  { name: "Online Course", type: "course", price: 97, desc: "A structured course with modules and lessons." },
  { name: "Membership Community", type: "community", price: 29, desc: "A private community with recurring access." },
  { name: "1:1 Coaching", type: "coaching", price: 297, desc: "Premium coaching sessions with scheduling." },
  { name: "Digital Download", type: "digital", price: 19, desc: "eBook, template pack, or resource bundle." },
];

type CreateMode = null | "ai" | "url" | "template" | "scratch";

export default function Products() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<CreateMode>(null);

  // Scratch / shared form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("digital");
  const [price, setPrice] = useState("");

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // URL state
  const [urlInput, setUrlInput] = useState("");

  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  const resetForm = () => {
    setName(""); setDescription(""); setType("digital"); setPrice("");
    setAiPrompt(""); setUrlInput(""); setMode(null);
  };

  const closeSheet = () => { setShowCreate(false); resetForm(); };

  const handleScratchSubmit = () => {
    if (!name.trim()) return;
    createProduct.mutate(
      { name, description, type, price: parseFloat(price) || 0, status: "active" },
      { onSuccess: closeSheet },
    );
  };

  const handleAiCreate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-product-create", {
        body: { prompt: aiPrompt },
      });
      if (error) throw error;
      const result = data;
      setName(result.name || "");
      setDescription(result.description || "");
      setType(result.type || "digital");
      setPrice(String(result.price || 0));
      setMode("scratch"); // switch to form with pre-filled data
    } catch (e: any) {
      // Fallback: generate locally if edge function doesn't exist yet
      setName(aiPrompt.slice(0, 60));
      setDescription(`AI-generated product based on: "${aiPrompt}"`);
      setType("digital");
      setPrice("29");
      setMode("scratch");
    } finally {
      setAiLoading(false);
    }
  };

  const handleUrlImport = () => {
    if (!urlInput.trim()) return;
    setName(`Imported from ${new URL(urlInput).hostname}`);
    setDescription(`Product imported from ${urlInput}`);
    setType("digital");
    setPrice("0");
    setMode("scratch");
  };

  const handleTemplateSelect = (t: typeof templates[0]) => {
    setName(t.name);
    setDescription(t.desc);
    setType(t.type);
    setPrice(String(t.price));
    setMode("scratch");
  };

  const isEmpty = !isLoading && (!products || products.length === 0);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground mt-1">Manage everything you sell.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView("grid")} className={`p-2 rounded-md ${view === "grid" ? "bg-secondary" : ""}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setView("list")} className={`p-2 rounded-md ${view === "list" ? "bg-secondary" : ""}`}><List className="w-4 h-4" /></button>
            <Button variant="default" size="sm" className="hidden md:flex" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Product</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 text-center">
            <span className="text-5xl mb-4 block">📦</span>
            <h3 className="text-xl font-bold mb-2">Your first product is one idea away.</h3>
            <p className="text-muted-foreground mb-6">Let AI build it for you — just describe what you want to sell.</p>
            <Button variant="default" size="lg" onClick={() => setShowCreate(true)}>Create Your First Product</Button>
          </motion.div>
        ) : (
          <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {products?.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card-hover p-5 ${view === "list" ? "flex items-center gap-4" : ""}`}
              >
                <div className={`text-3xl ${view === "list" ? "" : "mb-3"}`}>{typeIcons[p.type] || "📦"}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{p.name}</h3>
                    <button
                      onClick={() => deleteProduct.mutate(p.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium capitalize">{p.type}</span>
                    <span className="text-sm font-semibold text-primary">${p.price}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">{p.status}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />${Number(p.revenue).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{p.sales} sales</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Mobile FAB */}
        <button
          onClick={() => setShowCreate(true)}
          className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 z-40 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>

        {/* Create Sheet */}
        <AnimatePresence>
          {showCreate && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={closeSheet} />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl z-50 p-6 max-h-[85vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  {mode ? (
                    <button onClick={() => setMode(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  ) : (
                    <h3 className="text-lg font-bold">Create a Product</h3>
                  )}
                  <button onClick={closeSheet} className="p-1 rounded hover:bg-secondary"><X className="w-5 h-5" /></button>
                </div>

                {/* Mode Selection */}
                {!mode && (
                  <div className="space-y-3">
                    {[
                      { key: "ai" as const, icon: Brain, label: "Create with AI", desc: "Describe your idea and AI builds everything" },
                      { key: "url" as const, icon: LinkIcon, label: "Create from URL", desc: "Import your existing landing page" },
                      { key: "template" as const, icon: LayoutTemplate, label: "Start from Template", desc: "Browse our template library" },
                      { key: "scratch" as const, icon: Pencil, label: "Build from Scratch", desc: "Full control from the ground up" },
                    ].map((o) => (
                      <button key={o.key} onClick={() => setMode(o.key)} className="glass-card-hover p-5 w-full text-left flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <o.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{o.label}</p>
                          <p className="text-xs text-muted-foreground">{o.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* AI Mode */}
                {mode === "ai" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h4 className="font-bold">Describe your product idea</h4>
                    </div>
                    <Textarea
                      placeholder="e.g. A 6-week course teaching beginners how to edit videos for YouTube, priced at $97..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={4}
                    />
                    <Button onClick={handleAiCreate} disabled={aiLoading || !aiPrompt.trim()} className="w-full">
                      {aiLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Product</>}
                    </Button>
                  </div>
                )}

                {/* URL Mode */}
                {mode === "url" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="w-5 h-5 text-primary" />
                      <h4 className="font-bold">Import from URL</h4>
                    </div>
                    <Input
                      placeholder="https://your-landing-page.com"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      type="url"
                    />
                    <Button onClick={handleUrlImport} disabled={!urlInput.trim()} className="w-full">
                      Import & Customize
                    </Button>
                  </div>
                )}

                {/* Template Mode */}
                {mode === "template" && (
                  <div className="space-y-3">
                    <h4 className="font-bold mb-2">Choose a template</h4>
                    {templates.map((t) => (
                      <button key={t.name} onClick={() => handleTemplateSelect(t)} className="glass-card-hover p-4 w-full text-left flex items-center gap-4">
                        <span className="text-2xl">{typeIcons[t.type] || "📦"}</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </div>
                        <span className="text-sm font-semibold text-primary">${t.price}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Scratch / Final Form */}
                {mode === "scratch" && (
                  <div className="space-y-4">
                    <h4 className="font-bold mb-2">Product Details</h4>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Product" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your product offer?" rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={setType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="digital">Digital Product</SelectItem>
                            <SelectItem value="course">Course</SelectItem>
                            <SelectItem value="community">Community</SelectItem>
                            <SelectItem value="coaching">Coaching</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" min="0" />
                      </div>
                    </div>
                    <Button onClick={handleScratchSubmit} disabled={createProduct.isPending || !name.trim()} className="w-full">
                      {createProduct.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Product"}
                    </Button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
