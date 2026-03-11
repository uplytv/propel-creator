import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MoreVertical, Grid, List, Brain, Link as LinkIcon,
  LayoutTemplate, Pencil, Users, DollarSign, X, ArrowLeft,
  Loader2, Sparkles, Trash2, Video, Upload, ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/layout/AppLayout";
import { useProducts, useCreateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import UPLYMuxPlayer from "@/components/MuxPlayer";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  // Video upload state
  const [videoUploadUrl, setVideoUploadUrl] = useState<string | null>(null);
  const [videoUploadId, setVideoUploadId] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [videoPlaybackId, setVideoPlaybackId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  // Poll for video asset status
  useEffect(() => {
    if (!videoUploadId || videoStatus === 'ready') return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('mux_assets')
        .select('status, mux_playback_id')
        .eq('upload_id', videoUploadId)
        .single();

      if (data) {
        setVideoStatus(data.status);
        if (data.mux_playback_id) setVideoPlaybackId(data.mux_playback_id);
        if (data.status === 'ready' || data.status === 'errored') {
          clearInterval(interval);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [videoUploadId, videoStatus]);

  const resetForm = () => {
    setName(""); setDescription(""); setType("digital"); setPrice("");
    setAiPrompt(""); setUrlInput(""); setMode(null);
    setVideoUploadUrl(null); setVideoUploadId(null);
    setVideoUploading(false); setVideoProgress(0);
    setVideoStatus(null); setVideoPlaybackId(null);
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
      setMode("scratch");
    } catch (e: any) {
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

  const handleVideoUpload = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("mux-create-upload", {
        body: { userId: user.id, title: name || "Video content", description },
      });
      if (error) throw error;
      setVideoUploadUrl(data.uploadUrl);
      setVideoUploadId(data.uploadId);
      fileInputRef.current?.click();
    } catch (e: any) {
      toast({ title: "Upload error", description: e.message || "Failed to initialize upload", variant: "destructive" });
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoUploadUrl) return;

    setVideoUploading(true);
    setVideoProgress(0);
    setVideoStatus('preparing');

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setVideoProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setVideoUploading(false);
          toast({ title: "Upload complete!", description: "Video is being processed..." });
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        setVideoUploading(false);
        toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
      });

      xhr.open('PUT', videoUploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    } catch (err: any) {
      setVideoUploading(false);
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    }
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

        {/* Hidden file input for video upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileSelected}
        />

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

                    {/* Video Upload Section */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Video className="w-4 h-4" /> Video Content
                      </Label>
                      {!videoStatus && !videoUploading && (
                        <Button
                          variant="outline"
                          onClick={handleVideoUpload}
                          className="w-full"
                          type="button"
                        >
                          <Upload className="w-4 h-4 mr-2" /> Upload Video
                        </Button>
                      )}
                      {videoUploading && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading... {videoProgress}%
                          </div>
                          <Progress value={videoProgress} className="h-2" />
                        </div>
                      )}
                      {videoStatus === 'preparing' && !videoUploading && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 text-sm text-warning">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing video...
                        </div>
                      )}
                      {videoStatus === 'ready' && videoPlaybackId && (
                        <div className="rounded-xl overflow-hidden border border-border">
                          <UPLYMuxPlayer playbackId={videoPlaybackId} title={name} />
                        </div>
                      )}
                      {videoStatus === 'errored' && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-destructive/10 text-sm text-destructive">
                          <span>Video processing failed</span>
                          <Button variant="outline" size="sm" onClick={handleVideoUpload}>Retry</Button>
                        </div>
                      )}
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
