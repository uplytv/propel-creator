import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Globe, Copy, ChevronLeft, Trash2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Domain {
  id: string;
  creator_id: string;
  domain: string;
  verified: boolean;
  verification_token: string;
  created_at: string;
}

export default function SmartLinkDomains() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("smart_link_domains")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    setDomains((data || []) as Domain[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addDomain = async () => {
    if (!user || !newDomain.trim()) return;
    setAdding(true);
    try {
      const domain = newDomain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");

      if (!domain.includes(".")) {
        toast.error("Enter a valid domain (e.g. links.yourname.com)");
        return;
      }

      const { error } = await supabase
        .from("smart_link_domains")
        .insert({ creator_id: user.id, domain });

      if ((error as any)?.code === "23505") {
        toast.error("This domain is already registered");
        return;
      }
      if (error) throw error;

      setNewDomain("");
      toast.success("Domain added", {
        description: "Add the DNS TXT record below to verify it.",
      });
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add domain");
    } finally {
      setAdding(false);
    }
  };

  const verifyDomain = async (domainId: string) => {
    setVerifying(domainId);
    try {
      const { data, error } = await supabase.functions.invoke("smartlink-verify-domain", {
        body: { domain_id: domainId },
      });
      if (error || !(data as any)?.verified) {
        toast.error("DNS not verified yet", {
          description:
            "It can take up to 48h for DNS changes to propagate. Try again later.",
        });
      } else {
        toast.success("Domain verified! ✓", {
          description: "Your custom domain is now active.",
        });
        load();
      }
    } catch {
      toast.error("Verification check failed");
    } finally {
      setVerifying(null);
    }
  };

  const deleteDomain = async (domainId: string, domain: string) => {
    if (!confirm(`Remove ${domain}? This cannot be undone.`)) return;
    const { error } = await supabase
      .from("smart_link_domains")
      .delete()
      .eq("id", domainId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Domain removed");
    load();
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Link
          to="/smart-links"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to SmartLinks
        </Link>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Globe className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Custom Domains</h1>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">Free on UPLY</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Serve your SmartLinks from your own domain like{" "}
            <span className="font-mono text-foreground">links.yourartistname.com</span>.
            Linkfire and Feature.fm charge $29–$36/mo for this.
          </p>
        </div>

        {/* Add domain */}
        <Card className="p-4 space-y-3">
          <Label className="text-sm font-medium">Add a custom domain</Label>
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDomain()}
              placeholder="links.yourartistname.com"
              style={{ fontSize: "16px" }}
              className="min-h-[44px]"
            />
            <Button
              onClick={addDomain}
              disabled={adding || !newDomain.trim()}
              className="min-h-[44px] min-w-[80px]"
            >
              {adding ? "Adding..." : "Add"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can use a subdomain like <span className="font-mono">links.yourname.com</span>{" "}
            or a root domain. After adding, point a CNAME to{" "}
            <span className="font-mono">uply.tv</span> and add the TXT verification record.
          </p>
        </Card>

        {/* Domain list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : domains.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <Globe className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="font-medium">No custom domains yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first domain above to get started.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {domains.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-sm font-medium break-all">{d.domain}</p>
                      {d.verified ? (
                        <Badge className="bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                          <Clock className="h-3 w-3 mr-1" /> Pending DNS
                        </Badge>
                      )}
                    </div>

                    {d.verified ? (
                      <p className="text-xs text-muted-foreground">
                        Your SmartLinks are accessible at{" "}
                        <span className="font-mono text-foreground">
                          https://{d.domain}/link/[slug]
                        </span>
                      </p>
                    ) : (
                      <div className="space-y-3 rounded-md bg-muted/40 p-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground">
                            Step 1 — Add this CNAME record:
                          </p>
                          <div className="text-xs font-mono bg-background rounded px-2 py-1.5 break-all">
                            <span className="text-muted-foreground">Type:</span> CNAME{" "}
                            <span className="text-muted-foreground">·</span>{" "}
                            <span className="text-muted-foreground">Host:</span>{" "}
                            {d.domain.split(".").length > 2 ? d.domain.split(".")[0] : "@"}{" "}
                            <span className="text-muted-foreground">·</span>{" "}
                            <span className="text-muted-foreground">Value:</span> uply.tv
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground">
                            Step 2 — Add this TXT record to verify ownership:
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-background rounded px-2 py-1.5 break-all">
                              uply-verify={d.verification_token}
                            </code>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `uply-verify=${d.verification_token}`
                                );
                                toast.success("Copied");
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Record type: <span className="font-mono">TXT</span> · Host:{" "}
                            <span className="font-mono">@</span> or{" "}
                            <span className="font-mono">{d.domain.split(".")[0]}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!d.verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifyDomain(d.id)}
                        disabled={verifying === d.id}
                        className="min-h-[36px]"
                      >
                        {verifying === d.id ? "Checking..." : "Verify DNS"}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteDomain(d.id, d.domain)}
                      title="Remove domain"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">How it works:</span> After DNS
            propagates (up to 48h), fans can access your SmartLinks at your custom domain.
            Actual HTTPS routing requires Cloudflare for SaaS activation — once your domain is
            verified, contact support to activate routing.
          </p>
        </Card>
      </div>
    </div>
  );
}
