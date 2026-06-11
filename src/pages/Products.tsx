import { useState, useEffect, useRef } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, MoreVertical, Grid, List, Brain, Link as LinkIcon,
  LayoutTemplate, Pencil, Users, DollarSign, X, ArrowLeft,
  Loader2, Sparkles, Trash2, Video, Upload, ImageIcon, Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/layout/AppLayout";
import { useProducts, useCreateProduct, useDeleteProduct, useUpdateProduct } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
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
type EditingProduct = { id: string; name: string; description: string | null; type: string; price: number; status: string; image_url: string | null; download_url?: string | null; download_file_name?: string | null } | null;

export default function Products() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<CreateMode>(null);
  const { user } = useAuth();
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

  // Digital download upload state
  const downloadInputRef = useRef<HTMLInputElement>(null);
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [downloadUploading, setDownloadUploading] = useState(false);
  const [downloadStoragePath, setDownloadStoragePath] = useState<string | null>(null);

  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();

  // Edit state
  const [editingProduct, setEditingProduct] = useState<EditingProduct>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("digital");
  const [editPrice, setEditPrice] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  // Edit: digital download
  const editDownloadInputRef = useRef<HTMLInputElement>(null);
  const [editDownloadUploading, setEditDownloadUploading] = useState(false);
  const [editDownloadPath, setEditDownloadPath] = useState<string | null>(null);
  const [editDownloadName, setEditDownloadName] = useState<string | null>(null);

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditDescription(p.description || "");
    setEditType(p.type);
    setEditPrice(String(p.price));
    setEditImagePreview(p.image_url || null);
    setEditImageFile(null);
    setEditDownloadPath(p.download_url || null);
    setEditDownloadName(p.download_file_name || null);
  };

  const closeEdit = () => {
    setEditingProduct(null);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditImageUploading(false);
    setEditDownloadPath(null);
    setEditDownloadName(null);
    setEditDownloadUploading(false);
  };

  const handleEditImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleEditDownloadSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 500 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 500MB per download." });
      return;
    }
    setEditDownloadUploading(true);
    try {
      const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const path = `${user.id}/${Date.now()}-${safeBase}`;
      const { error } = await supabase.storage
        .from('digital-products')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setEditDownloadPath(path);
      setEditDownloadName(file.name);
      toast.success("Download file uploaded");
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setEditDownloadUploading(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editingProduct || !editName.trim()) return;
    let image_url: string | null | undefined = undefined;

    if (editImageFile && user) {
      setEditImageUploading(true);
      try {
        const ext = editImageFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('product-images').upload(path, editImageFile);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
        image_url = publicUrl;
      } catch (e: any) {
        toast.error("Image upload failed", { description: e.message });
        setEditImageUploading(false);
        return;
      }
      setEditImageUploading(false);
    } else if (!editImagePreview && editingProduct.image_url) {
      image_url = null; // removed
    }

    if (editType === "digital" && !editDownloadPath) {
      toast.error("Add a download file", { description: "Digital products need a file buyers can download." });
      return;
    }

    const updates: any = {
      id: editingProduct.id,
      name: editName,
      description: editDescription,
      type: editType,
      price: parseFloat(editPrice) || 0,
    };
    if (image_url !== undefined) updates.image_url = image_url;

    // Persist download fields when product is digital; clear when switching away
    if (editType === "digital") {
      updates.download_url = editDownloadPath;
      updates.download_file_name = editDownloadName;
    } else if (editingProduct.download_url) {
      updates.download_url = null;
      updates.download_file_name = null;
    }

    updateProduct.mutate(updates, { onSuccess: closeEdit });
  };

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
    setImageFile(null); setImagePreview(null); setImageUploading(false);
    setDownloadFile(null); setDownloadStoragePath(null); setDownloadUploading(false);
  };

  const closeSheet = () => { setShowCreate(false); resetForm(); };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    setImageUploading(true);
    try {
      const ext = imageFile.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, imageFile);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      return publicUrl;
    } catch (e: any) {
      toast.error("Image upload failed", { description: e.message });
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Verify digital purchase on return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const productId = params.get("product_id");
    const purchased = params.get("purchased");
    if (purchased === "true" && sessionId && productId && user) {
      supabase.functions
        .invoke("verify-product-purchase", { body: { session_id: sessionId, product_id: productId } })
        .then(({ data }: any) => {
          if (data?.is_digital) {
            toast.success("Purchase complete! 📥", {
              description: "Check your email for the download link (expires in 1h).",
            });
          } else if (data?.paid) {
            toast.success("Purchase complete! 🎉");
          }
        })
        .catch(() => {
          toast.success("Payment received", { description: "Your purchase is being processed." });
        })
        .finally(() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("session_id");
          url.searchParams.delete("purchased");
          url.searchParams.delete("product_id");
          window.history.replaceState({}, "", url.toString());
        });
    }
  }, [user]);

  const handleDownloadFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 500 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 500MB per download." });
      return;
    }
    setDownloadFile(file);
    setDownloadUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const path = `${user.id}/${Date.now()}-${safeBase}`;
      const { error } = await supabase.storage
        .from('digital-products')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setDownloadStoragePath(path);
      toast.success("Download file uploaded");
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
      setDownloadFile(null);
    } finally {
      setDownloadUploading(false);
    }
  };

  const handleScratchSubmit = async () => {
    if (!name.trim()) return;
    if (type === "digital" && !downloadStoragePath) {
      toast.error("Add a download file", { description: "Digital products need a file buyers can download." });
      return;
    }
    let image_url: string | undefined;
    if (imageFile) {
      const url = await uploadImage();
      if (url) image_url = url;
    }
    createProduct.mutate(
      {
        name,
        description,
        type,
        price: parseFloat(price) || 0,
        status: "active",
        image_url,
        download_url: type === "digital" ? downloadStoragePath : null,
        download_file_name: type === "digital" ? (downloadFile?.name ?? null) : null,
      },
      { onSuccess: closeSheet },
    );
  };

  const handleAiCreate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-copy", {
        body: { prompt: aiPrompt },
      });
      if (error) throw error;
      setName(data.name || aiPrompt.slice(0, 60));
      setDescription(data.description || "");
      setType(data.type || "digital");
      setPrice(String(data.price || 29));
      setMode("scratch");
      toast.success("AI generated your product details!");
    } catch (e: any) {
      toast.error("AI generation failed", { description: e.message || "Please try again" });
    } finally {
      setAiLoading(false);
    }
  };

  const [urlLoading, setUrlLoading] = useState(false);

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      // Ensure it's a valid URL
      let finalUrl = urlInput.trim();
      if (!finalUrl.startsWith("http")) finalUrl = "https://" + finalUrl;
      new URL(finalUrl); // validate

      const { data, error } = await supabase.functions.invoke("import-from-url", {
        body: { url: finalUrl },
      });
      if (error) throw error;
      setName(data.name || `Imported from ${new URL(finalUrl).hostname}`);
      setDescription(data.description || "");
      setType(data.type || "digital");
      setPrice(String(data.price || 0));
      setMode("scratch");
      toast.success("Product imported from URL!");
    } catch (e: any) {
      toast.error("Import failed", { description: e.message || "Could not import from that URL" });
    } finally {
      setUrlLoading(false);
    }
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
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setVideoUploading(true);
    setVideoProgress(0);
    setVideoStatus('preparing');

    try {
      const { uploadToMuxWithRetry } = await import("@/lib/muxUpload");
      const uploadId = await uploadToMuxWithRetry({
        userId: user.id,
        title: name || "Video content",
        description,
        file,
        onProgress: setVideoProgress,
      });
      setVideoUploadId(uploadId);
      setVideoUploading(false);
      toast.success("Upload complete!", { description: "Video is being processed..." });
    } catch (err: any) {
      setVideoUploading(false);
      toast.error("Upload failed", { description: err.message });
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
            <Button variant="soft" size="sm" className="hidden md:flex" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Product</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <EmptyState
            icon={Package}
            title="Your first product is one idea away"
            description="Sell courses, downloads, coaching sessions, or memberships. Let AI build it for you — just describe what you want to sell."
            actionLabel="Create Your First Product"
            onAction={() => setShowCreate(true)}
            secondaryLabel="Browse Templates"
            onSecondary={() => { setShowCreate(true); setMode("template"); }}
          />
        ) : (
          <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {products?.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card-hover cursor-pointer overflow-hidden ${view === "list" ? "flex items-center gap-4 p-5" : ""}`}
                onClick={() => user && navigate(`/community/${user.id}`, { state: { tab: p.type === 'course' ? 'classroom' : 'community' } })}
              >
                {view === "grid" && (p as any).image_url && (
                  <img src={(p as any).image_url} alt={p.name} className="w-full h-36 object-cover" loading="lazy" />
                )}
                <div className={`flex-1 ${view === "grid" ? "p-5" : ""}`}>
                  {view === "list" && (
                    (p as any).image_url
                      ? <img src={(p as any).image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                      : <div className="text-3xl">{typeIcons[p.type] || "📦"}</div>
                  )}
                  {view === "grid" && !(p as any).image_url && (
                    <div className="text-3xl mb-3">{typeIcons[p.type] || "📦"}</div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">{p.name}</h3>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                          className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProduct.mutate(p.id); }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl z-50 p-6 pb-24 max-h-[85vh] overflow-y-auto"
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
                    <Button onClick={handleUrlImport} disabled={!urlInput.trim() || urlLoading} className="w-full">
                      {urlLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</> : "Import & Customize"}
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

                    {/* Digital Download File (only for digital products) */}
                    {type === "digital" && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Upload className="w-4 h-4" /> Download File
                        </Label>
                        {downloadStoragePath && downloadFile ? (
                          <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-secondary/30">
                            <span className="text-xs text-foreground truncate">{downloadFile.name}</span>
                            <button
                              type="button"
                              onClick={() => { setDownloadFile(null); setDownloadStoragePath(null); }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : downloadUploading ? (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" /> Uploading file...
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => downloadInputRef.current?.click()}
                            className="w-full flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border border-dashed border-border hover:border-primary/30 hover:bg-secondary/30 transition-colors cursor-pointer"
                          >
                            <Upload className="w-5 h-5 text-primary" />
                            <span className="text-xs text-muted-foreground">Upload the file buyers will download (max 500MB)</span>
                          </button>
                        )}
                        <input
                          ref={downloadInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleDownloadFileSelected}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Buyers receive a secure 1-hour download link by email after purchase.
                        </p>
                      </div>
                    )}

                    {/* Image Upload Section */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Product Image
                      </Label>
                      {imagePreview ? (
                        <div className="relative rounded-lg overflow-hidden border border-border">
                          <img src={imagePreview} alt="Preview" className="w-full h-36 object-cover" loading="lazy" />
                          <button
                            onClick={() => { setImageFile(null); setImagePreview(null); }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="w-full flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border border-dashed border-border hover:border-primary/30 hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <ImageIcon className="w-5 h-5 text-primary" />
                          <span className="text-xs text-muted-foreground">Click to upload an image</span>
                        </button>
                      )}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelected}
                      />
                    </div>

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

                    <Button onClick={handleScratchSubmit} disabled={createProduct.isPending || imageUploading || !name.trim()} className="w-full">
                      {createProduct.isPending || imageUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {imageUploading ? "Uploading image..." : "Creating..."}</> : "Create Product"}
                    </Button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Edit Product Sheet */}
        <AnimatePresence>
          {editingProduct && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={closeEdit} />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl z-50 p-6 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Edit Product</h3>
                  <button onClick={closeEdit} className="p-1 rounded hover:bg-secondary"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Product name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={editType} onValueChange={setEditType}>
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
                      <Input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="0" min="0" />
                    </div>
                  </div>

                  {/* Image */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Product Image</Label>
                    {editImagePreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-border">
                        <img src={editImagePreview} alt="Preview" className="w-full h-36 object-cover" loading="lazy" />
                        <button
                          onClick={() => { setEditImageFile(null); setEditImagePreview(null); }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => editImageInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border border-dashed border-border hover:border-primary/30 hover:bg-secondary/30 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-5 h-5 text-primary" />
                        <span className="text-xs text-muted-foreground">Click to upload an image</span>
                      </button>
                    )}
                    <input
                      ref={editImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEditImageSelected}
                    />
                  </div>

                  {/* Digital download file (only for digital type) */}
                  {editType === "digital" && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Upload className="w-4 h-4" /> Download File</Label>
                      {editDownloadPath ? (
                        <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border bg-secondary/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <Package className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-sm truncate">{editDownloadName || "Download file attached"}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => editDownloadInputRef.current?.click()}
                              className="text-xs text-primary hover:underline px-2 py-1"
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditDownloadPath(null); setEditDownloadName(null); }}
                              className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => editDownloadInputRef.current?.click()}
                          disabled={editDownloadUploading}
                          className="w-full flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border border-dashed border-border hover:border-primary/30 hover:bg-secondary/30 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {editDownloadUploading ? (
                            <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-xs text-muted-foreground">Uploading…</span></>
                          ) : (
                            <><Upload className="w-5 h-5 text-primary" /><span className="text-xs text-muted-foreground">Click to upload (max 500MB)</span></>
                          )}
                        </button>
                      )}
                      <input
                        ref={editDownloadInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleEditDownloadSelected}
                      />
                      <p className="text-xs text-muted-foreground">Buyers receive a 1h signed download link via email after purchase.</p>
                    </div>
                  )}

                  <Button onClick={handleEditSubmit} disabled={updateProduct.isPending || editImageUploading || editDownloadUploading || !editName.trim()} className="w-full">
                    {updateProduct.isPending || editImageUploading || editDownloadUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {editImageUploading ? "Uploading image..." : editDownloadUploading ? "Uploading file..." : "Saving..."}</> : "Save Changes"}
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
