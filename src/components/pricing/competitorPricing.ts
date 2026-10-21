// Official published USD pricing reviewed in October 2026.
// null means a processing-excluded rate cannot be established. Never guess it.
export interface CompetitorPrice {
  name: string;
  monthly: number;
  annual?: number;
  platformRate: number | null;
  source: string;
  feeSource: string;
  note: string;
}
export const COMPETITOR_PRICING: CompetitorPrice[] = [
  { name: "Skool Hobby", monthly: 9, platformRate: null,
    source: "https://www.skool.com/pricing", feeSource: "https://help.skool.com/article/86-payments-faq",
    note: "Published 10% + $0.30 bundles payment charges. Processing-only portion is not separately documented." },
  { name: "Skool Pro", monthly: 99, platformRate: null,
    source: "https://www.skool.com/pricing", feeSource: "https://help.skool.com/article/86-payments-faq",
    note: "Published 2.9% + $0.30 for payments up to $899 bundles payment charges; higher-value payments differ." },
  { name: "Whop Standard", monthly: 0, platformRate: null,
    source: "https://whop.com/network/pricing/", feeSource: "https://docs.whop.com/payments-and-billing/fees/fees",
    note: "Published domestic card payment rate is 2.7% + $0.30. A separate processing-excluded platform rate is not established." },
  { name: "Patreon Standard", monthly: 0, platformRate: 0.10,
    source: "https://www.patreon.com/pricing", feeSource: "https://support.patreon.com/hc/en-us/articles/11111747095181-Creator-fees-overview",
    note: "10% platform fee for standard new creator pages. Legacy plans differ." },
  { name: "Kajabi Basic", monthly: 179, annual: 1716, platformRate: 0.02,
    source: "https://www.kajabi.com/pricing-new", feeSource: "https://help.kajabi.com/en/articles/17174626-kajabi-payments-processing-fees",
    note: "2% additional fee when using a third-party payment provider. Provider processing excluded." },
  { name: "Mighty Launch", monthly: 95, annual: 948, platformRate: 0.02,
    source: "https://docs.mightynetworks.com/for-hosts/meet-mighty/whats-included-in-the-mighty-networks-courses-plan",
    feeSource: "https://docs.mightynetworks.com/for-hosts/payments-and-access/does-mighty-networks-charge-a-transaction-fee",
    note: "$95 monthly or $79/month paid annually. 2% platform transaction fee." },
];

export function monthlyPlatformCost(revenue: number, monthly: number, rate: number): number {
  const safeRevenue = Number.isFinite(revenue) ? Math.max(0, revenue) : 0;
  return Math.round((monthly + safeRevenue * rate) * 100) / 100;
}