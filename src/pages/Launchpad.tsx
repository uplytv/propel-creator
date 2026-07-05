import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, BookOpen, Users, Radio, Briefcase, ArrowRight,
  Sparkles, Zap, X, Loader2, CheckCircle2, ImagePlus, Wand2,
  Globe, Lock, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import PageHero from "@/components/layout/PageHero";
import { useAuth } from "@/context/AuthContext";
import { useCreateProduct } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";

const launchOptions = [
  {
    id: "course",
    emoji: "📚",
    title: "Course",
    subtitle: "Teach what you know",
    description: "Create a structured course with modules, lessons, and video content. Perfect for sharing your expertise.",
    color: "from-blue-500/20 to-indigo-500/20",
    borderColor: "border-blue-500/30 hover:border-blue-500/50",
    accentColor: "text-blue-400",
    bgAccent: "bg-blue-500/10",
    icon: BookOpen,
    fields: { defaultPrice: 97, defaultName: "", placeholder: "e.g. Master YouTube Growth in 30 Days" },
  },
  {
    id: "community",
    emoji: "🤝",
    title: "Community",
    subtitle: "Build your tribe",
    description: "Launch a private community with posts, events, and member engagement. Recurring revenue from memberships.",
    color: "from-emerald-500/20 to-green-500/20",
    borderColor: "border-emerald-500/30 hover:border-emerald-500/50",
    accentColor: "text-emerald-400",
    bgAccent: "bg-emerald-500/10",
    icon: Users,
    fields: { defaultPrice: 29, defaultName: "", placeholder: "e.g. Creator Mastermind Circle" },
  },
  {
    id: "stream",
    emoji: "🎙️",
    title: "Live Stream",
    subtitle: "Go live instantly",
    description: "Start streaming to your audience right now. Use your browser or connect OBS for a pro setup.",
    color: "from-red-500/20 to-pink-500/20",
    borderColor: "border-red-500/30 hover:border-red-500/50",
    accentColor: "text-red-400",
    bgAccent: "bg-red-500/10",
    icon: Radio,
    fields: null, // Direct action — goes to /go-live
  },
  {
    id: "service",
    emoji: "🎯",
    title: "Service",
    subtitle: "Sell your skills",
    description: "Offer coaching, consulting, or done-for-you services. Set your rate and let clients book you.",
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30 hover:border-amber-500/50",
    accentColor: "text-amber-400",
    bgAccent: "bg-amber-500/10",
    icon: Briefcase,
    fields: { defaultPrice: 197, defaultName: "", placeholder: "e.g. 1:1 Brand Strategy Session" },
  },
];

export default function Launchpad() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createProduct = useCreateProduct();
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [idea, setIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [isFree, setIsFree] = useState(true);

  const option = launchOptions.find((o) => o.id === selected);

  const handleSelect = (id: string) => {
    if (id === "stream") {
      navigate("/go-live");
      return;
    }
    const opt = launchOptions.find((o) => o.id === id)!;
    setSelected(id);
    setName("");
    setDescription("");
    setPrice(String(opt.fields!.defaultPrice));
    setSuccess(false);
    setImageFile(null);
    setImagePreview(null);
    setIdea("");
    setIsPublic(true);
    setIsFree(id === "community" || id === "course");
  };

  const handleGenerate = async () => {
    if (!idea.trim() || !option) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-copy", {
        body: { idea: idea.trim(), productType: option.id },
      });
      if (error) throw error;
      if (data?.name) setName(data.name);
      if (data?.description) setDescription(data.description);
      toast.success("AI filled in your name & description!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    setUploadingImage(true);
    const ext = imageFile.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, imageFile, { upsert: true });
    setUploadingImage(false);
    if (error) return null;
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleLaunch = async () => {
    if (!name.trim() || !option) return;
    setCreating(true);

    const imageUrl = await uploadImage();
    const productType = option.id === "service" ? "coaching" : option.id;
    const finalPrice = isFree && (option.id === "community" || option.id === "course") ? 0 : (parseFloat(price) || 0);

    createProduct.mutate(
      {
        name,
        description: description || undefined,
        type: productType,
        price: finalPrice,
        status: "active",
        image_url: imageUrl || undefined,
      },
      {
        onSuccess: async () => {
          // For community, also create/update the creator_spaces entry
          if (option.id === "community" && user) {
            const { data: existing } = await supabase
              .from("creator_spaces")
              .select("id")
              .eq("creator_id", user.id)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("creator_spaces")
                .update({
                  is_public: isPublic,
                  is_free: isFree,
                  price: finalPrice,
                  name: name.trim(),
                  description: description || "",
                  cover_image_url: imageUrl || undefined,
                })
                .eq("creator_id", user.id);
            } else {
              await supabase
                .from("creator_spaces")
                .insert({
                  creator_id: user.id,
                  is_public: isPublic,
                  is_free: isFree,
                  price: finalPrice,
                  name: name.trim(),
                  description: description || "",
                  cover_image_url: imageUrl || undefined,
                });
            }
          }
          setCreating(false);
          setSuccess(true);
        },
        onError: () => {
          setCreating(false);
        },
      }
    );
  };

  const handleGoToProduct = () => {
    if (!user) return;
    const tab = option?.id === "course" ? "classroom" : "community";
    navigate(`/community/${user.id}`, { state: { tab } });
  };

  const resetSelection = () => {
    setSelected(null);
    setName("");
    setDescription("");
    setPrice("");
    setSuccess(false);
    setImageFile(null);
    setImagePreview(null);
    setIdea("");
    setIsPublic(true);
    setIsFree(true);
  };

  return (
    <AppLayout>
      <PageHero
        eyebrow="Launchpad"
        title="Creator"
        gradientWord="Launchpad"
        subtitle="Pick what you want to launch. We'll handle the rest."
      />
      <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <AnimatePresence mode="wait">
            {!selected ? (
              /* Launch Options Grid */
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {launchOptions.map((opt, i) => (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 25 }}
                    onClick={() => handleSelect(opt.id)}
                    className={`group relative overflow-hidden rounded-2xl border ${opt.borderColor} bg-card p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]`}
                  >
                    {/* Gradient background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl ${opt.bgAccent} flex items-center justify-center text-2xl`}>
                          {opt.emoji}
                        </div>
                        <ArrowRight className={`w-5 h-5 ${opt.accentColor} opacity-0 group-hover:opacity-100 transform translate-x-[-8px] group-hover:translate-x-0 transition-all duration-300`} />
                      </div>

                      <h3 className="text-lg font-bold text-foreground mb-0.5">{opt.title}</h3>
                      <p className={`text-sm font-medium ${opt.accentColor} mb-2`}>{opt.subtitle}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>

                      {opt.id === "stream" && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-[11px] font-semibold text-red-400">Instant — no setup needed</span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : success ? (
              /* Success State */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-5" />
                </motion.div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {option?.emoji} {name} is live!
                </h2>
                <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                  Your {option?.title.toLowerCase()} has been created and is ready for your audience.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button variant="hero" size="lg" onClick={handleGoToProduct}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Go to {option?.title}
                  </Button>
                  <Button variant="outline" size="lg" onClick={resetSelection}>
                    Launch Something Else
                  </Button>
                </div>
              </motion.div>
            ) : (
              /* Quick Setup Form */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-lg mx-auto"
              >
                {/* Back button + selected type */}
                <button
                  onClick={resetSelection}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  ← Back to options
                </button>

                <div className="glass-card p-6 space-y-5">
                  {/* Selected type indicator */}
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className={`w-11 h-11 rounded-xl ${option?.bgAccent} flex items-center justify-center text-xl`}>
                      {option?.emoji}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Launch your {option?.title}</h2>
                      <p className="text-xs text-muted-foreground">Fill in the basics — you can customize later.</p>
                    </div>
                  </div>

                  {/* AI Idea Generator */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">AI Auto-fill</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">Describe your idea</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="e.g. Help beginners grow on YouTube fast"
                        className="text-sm flex-1"
                        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={!idea.trim() || generating}
                        className="shrink-0 border-primary/30 hover:bg-primary/10"
                      >
                        {generating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5 mr-1" /> Generate</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={option?.fields?.placeholder}
                      className="text-sm"
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Description <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What will people get?"
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Cover Image <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-border">
                        <img src={imagePreview} alt="Cover preview" className="w-full h-36 object-cover" />
                        <button
                          type="button"
                          onClick={() => { setImageFile(null); setImagePreview(null); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
                        >
                          <X className="w-4 h-4 text-foreground" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-colors"
                      >
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Tap to upload a cover image</span>
                      </button>
                    )}
                  </div>

                  {/* Visibility & Pricing (community & course) */}
                  {(selected === "community" || selected === "course") && (
                    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isPublic ? <Globe className="w-4 h-4 text-muted-foreground" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                          <div>
                            <p className="text-sm font-medium text-foreground">{isPublic ? "Public" : "Private"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {isPublic ? "Anyone can discover & view" : "Invite-only access"}
                            </p>
                          </div>
                        </div>
                        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                      </div>
                      <div className="border-t border-border" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{isFree ? "Free" : "Paid"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {isFree
                                ? (selected === "course" ? "No charge to enroll" : "No charge to join")
                                : (selected === "course" ? "One-time purchase" : "Monthly membership fee")}
                            </p>
                          </div>
                        </div>
                        <Switch checked={!isFree} onCheckedChange={(checked) => setIsFree(!checked)} />
                      </div>
                    </div>
                  )}

                  {/* Price — show for non-community/course, or when paid */}
                  {((selected !== "community" && selected !== "course") || !isFree) && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        {selected === "community" ? "Monthly Price (USD)" : "Price (USD)"}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          min="0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="pl-7 text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {/* Launch Button */}
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={handleLaunch}
                    disabled={!name.trim() || creating}
                    className="w-full"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" /> Launch {option?.title}
                      </>
                    )}
                  </Button>

                  <p className="text-[11px] text-muted-foreground text-center">
                    You can always edit details, add content, and update pricing later.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppLayout>
  );
}
