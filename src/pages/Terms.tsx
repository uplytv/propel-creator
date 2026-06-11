import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";

/**
 * Terms of Service page.
 * NOTE: This is a structured starting template. Have it reviewed by legal
 * counsel before relying on it.
 */
export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Terms of Service · UPLY"
        description="The terms that govern your use of UPLY."
      />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Draft template — review with legal counsel before launch.
        </div>

        <article className="prose prose-invert max-w-none prose-headings:font-semibold">
          <h1>Terms of Service</h1>
          <p className="text-foreground/60">Last updated: June 11, 2026</p>

          <p>
            These Terms govern your use of UPLY (uply.tv) and related services
            (the "Service"). By using the Service you agree to these Terms.
          </p>

          <h2>1. Accounts</h2>
          <p>
            You must provide accurate information and are responsible for
            activity under your account. You must be at least 13 (or the minimum
            age in your jurisdiction).
          </p>

          <h2>2. Creator monetization &amp; payouts</h2>
          <p>
            Creators receive <strong>95%</strong> of net revenue from their
            sales and subscriptions; UPLY retains a 5% platform fee. Payments
            and payouts are processed by Stripe and subject to Stripe's terms.
            You are responsible for any taxes on your earnings.
          </p>

          <h2>3. Content</h2>
          <p>
            You retain ownership of content you create. You grant UPLY a license
            to host, display, and distribute it as needed to operate the
            Service. You must have the rights to any content you upload and must
            not post unlawful or infringing material.
          </p>

          <h2>4. Purchases &amp; refunds</h2>
          <p>
            Ticket, subscription, and product purchases are subject to the
            applicable creator's and UPLY's refund policies disclosed at
            checkout. Chargebacks and disputes may result in suspension of
            access.
          </p>

          <h2>5. Acceptable use</h2>
          <p>
            Do not abuse, reverse-engineer, or disrupt the Service, infringe
            others' rights, or attempt to circumvent access controls or payment.
          </p>

          <h2>6. Termination</h2>
          <p>We may suspend or terminate accounts that violate these Terms.</p>

          <h2>7. Disclaimers &amp; liability</h2>
          <p>
            The Service is provided "as is" without warranties. To the extent
            permitted by law, UPLY is not liable for indirect or consequential
            damages.
          </p>

          <h2>8. Changes</h2>
          <p>We may update these Terms and will post the revised date above.</p>

          <h2>9. Contact</h2>
          <p>Questions? Email <a href="mailto:legal@uply.tv">legal@uply.tv</a>.</p>
        </article>
      </div>
    </div>
  );
}
