import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  MousePointerClick,
  QrCode,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppLayout from "@/components/layout/AppLayout";
import EventPromoCard from "@/components/affiliates/EventPromoCard";
import { useAffiliateLink, useAffiliateStats } from "@/hooks/useAffiliates";
import {
  AFFILIATE_COMMISSION_PCT,
  PLATFORM_PLANS,
  affiliateCommissionFor,
} from "@/components/pricing/plans";
import { format } from "date-fns";

/**
 * 50% affiliate program page — every creator gets one.
 *
 * MONEY MODEL: commissions are a PLATFORM marketing cost paid by UPLY out of
 * its own plan revenue ($97/$297/$497). They never touch creator money and
 * never alter the 95/5 creator payout split. All commission amounts are
 * computed server-side (affiliate-commission-reconciler) from Stripe-verified
 * invoices — nothing on this page can mint or change a commission.
 */

const PROMO_BLURBS = [
  {
    title: "The all-in-one pitch",
    text: (offerUrl: string) =>
      `I run my whole creator business on UPLY — site, community, courses, live streams, and payouts in one login instead of five subscriptions. New creators currently get a 30-day free trial plus a setup call where a real person builds your funnel with you. My link gets you in: ${offerUrl}`,
  },
  {
    title: "The replace-your-stack pitch",
    text: (offerUrl: string) =>
      `If you're paying for a link tool, a course tool, an email tool, and a community tool just to sell one thing — stop. UPLY replaces the stack and pays creators 95% of everything they earn. Through my link your first 30 days are free: ${offerUrl}`,
  },
  {
    title: "The setup-call pitch",
    text: (offerUrl: string) =>
      `The fastest zero-to-selling path I've seen: UPLY's free setup call. They build your website funnel, an SEO blog post, and your community & course space with you, live. Free with the 30-day trial on my link — cancel anytime if it's not for you: ${offerUrl}`,
  },
];

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="default"
      size="sm"
      className="flex-shrink-0 gap-1.5 rounded-none font-bold"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export default function Affiliates() {
  const { data: linkData, isLoading: linkLoading } = useAffiliateLink();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();
  const [showQr, setShowQr] = useState(false);

  const isLoading = linkLoading || statsLoading;
  const code = linkData?.code ?? "";

  // Personal link (sets the uply_ref platform cookie) and the founding-offer
  // link — the one we tell affiliates to actually share.
  const personalUrl = code ? `https://uply.tv/ref/${code}` : "";
  const offerUrl = code ? `https://uply.tv/founding-offer?ref=${encodeURIComponent(code)}` : "";

  const commissionRows = useMemo(
    () =>
      PLATFORM_PLANS.map((p) => ({
        name: p.name,
        price: p.price,
        commission: affiliateCommissionFor(p.price),
      })),
    [],
  );

  const handleShareX = () => {
    const text = encodeURIComponent(
      "One login for your whole creator business — and a real human builds your setup with you. 30 days free through my link:",
    );
    window.open(`https://x.com/intent/tweet?text=${text}&url=${encodeURIComponent(offerUrl)}`, "_blank");
  };

  const statCards = [
    { label: "Link clicks", value: stats?.totalClicks ?? 0, icon: MousePointerClick },
    { label: "Signups", value: stats?.totalSignups ?? 0, icon: Users },
    { label: "Pending commission", value: `$${(stats?.pendingEarnings ?? 0).toFixed(2)}`, icon: DollarSign },
    { label: "Approved commission", value: `$${((stats?.approvedEarnings ?? 0) + (stats?.paidEarnings ?? 0)).toFixed(2)}`, icon: ShieldCheck },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            UPLY Affiliate Program
          </p>
          <h1 className="text-2xl font-bold md:text-3xl">
            Earn {AFFILIATE_COMMISSION_PCT}% of every plan you refer
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Send another creator to UPLY. When their trial converts to a paid plan, you earn
            half of their first month — paid by UPLY out of our own plan revenue, never out of
            any creator's 95% payout.
          </p>
        </motion.div>

        {/* The math */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {commissionRows.map((row) => (
            <div key={row.name} className="rounded-none border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {row.name} · ${row.price}/mo
              </p>
              <p className="mt-1 text-2xl font-bold text-primary">${row.commission.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">per referral's first month</p>
            </div>
          ))}
        </motion.div>

        {/* Personal link + QR */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-none border border-border bg-card p-5"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your personal link
          </p>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 truncate rounded-none border border-border bg-secondary px-4 py-2.5 font-mono text-sm text-muted-foreground">
                  {personalUrl.replace("https://", "")}
                </div>
                <CopyButton value={personalUrl} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleShareX} className="gap-1.5 rounded-none text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Share on X
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQr((v) => !v)}
                  className="gap-1.5 rounded-none text-xs"
                >
                  <QrCode className="h-3.5 w-3.5" /> {showQr ? "Hide QR" : "Show QR"}
                </Button>
              </div>
              {showQr && offerUrl && (
                <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
                  <div className="bg-white p-2">
                    <QRCodeCanvas value={offerUrl} size={132} includeMargin={false} />
                  </div>
                  <p className="max-w-[220px] text-xs text-muted-foreground">
                    Scan opens your founding-offer link with your code attached — good for
                    flyers, merch tables, and green rooms.
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Share the offer — the recommended asset */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-none border border-primary/40 bg-primary/5 p-5"
        >
          <div className="flex items-start gap-3">
            <Share2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Share the founding offer — it converts best</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Your referrals land on the limited-time founding-creator page: a 30-day free
                trial (double the standard 14), a human-built setup call, and a rate-lock
                promise. Same plans, same prices — your code just rides along.
              </p>
              {isLoading ? (
                <Skeleton className="mt-3 h-10 w-full" />
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1 truncate rounded-none border border-border bg-background px-4 py-2.5 font-mono text-sm text-muted-foreground">
                    {offerUrl.replace("https://", "")}
                  </div>
                  <CopyButton value={offerUrl} />
                </div>
              )}
              <Link
                to="/founding-offer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Preview the offer page <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="rounded-none border border-border bg-card p-4"
              >
                <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <p className="font-mono text-xl font-bold">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Ready-to-paste promo blurbs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-none border border-border bg-card"
        >
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-semibold">Ready-to-paste pitches</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Post them as-is or make them yours — your offer link is already inside.
            </p>
          </div>
          <div className="divide-y divide-border">
            {PROMO_BLURBS.map((blurb) => {
              const text = blurb.text(offerUrl || "https://uply.tv/founding-offer");
              return (
                <div key={blurb.title} className="flex items-start gap-3 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {blurb.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground">{text}</p>
                  </div>
                  <CopyButton value={text} />
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Honest terms */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-none border border-border bg-muted/40 p-5"
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" /> How commissions actually work
          </h3>
          <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li>
              • You earn <span className="font-semibold text-foreground">50% of your referral's first paid month</span>{" "}
              after their free trial converts — $48.50, $148.50, or $248.50 on today's plans.
            </li>
            <li>
              • Version one pays on the first paid month only. Recurring commission is on our
              roadmap, but we won't promise it until we ship it.
            </li>
            <li>
              • Tracking is automatic: your link sets a 30-day cookie, and every commission is
              verified against the actual Stripe invoice before it's owed.
            </li>
            <li>
              • Payouts are reviewed and approved by UPLY, then sent monthly to your connected
              Stripe account.
            </li>
            <li>
              • Self-referrals are void. Commissions come out of UPLY's own plan revenue — the
              95% creator payout is never touched, yours or theirs.
            </li>
          </ul>
        </motion.div>

        {/* Event promoter links (self-hides unless this user promotes events) */}
        <EventPromoCard />

        {/* Conversions Table */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="overflow-hidden rounded-none border border-border bg-card"
        >
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-semibold">Conversion history</h3>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (stats?.conversions?.length || 0) === 0 ? (
            <div className="p-12 text-center">
              <Share2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No conversions yet. Share your offer link to start earning.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred user</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats!.conversions.map((conv: any, i: number) => (
                  <TableRow key={conv.id}>
                    <TableCell className="font-mono text-xs">Creator #{i + 1}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(conv.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={conv.conversion_type === "signup" ? "secondary" : "default"}
                        className="rounded-none text-xs"
                      >
                        {conv.conversion_type === "platform_subscription" ? "plan" : conv.conversion_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${Number(conv.commission_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={conv.status === "paid" ? "default" : "outline"}
                        className="rounded-none text-xs"
                      >
                        {conv.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
