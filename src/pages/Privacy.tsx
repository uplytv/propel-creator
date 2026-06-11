import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";

/**
 * Privacy Policy page.
 * NOTE: This is a structured starting template. Have it reviewed by legal
 * counsel before relying on it for compliance (GDPR/CCPA/etc.).
 */
export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Privacy Policy · UPLY"
        description="How UPLY collects, uses, and protects your data."
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
          <h1>Privacy Policy</h1>
          <p className="text-foreground/60">Last updated: June 11, 2026</p>

          <p>
            This Privacy Policy explains how UPLY ("UPLY", "we", "us") collects,
            uses, and shares information when you use uply.tv and related
            services (the "Service").
          </p>

          <h2>1. Information we collect</h2>
          <ul>
            <li><strong>Account information</strong> — name, email, username, and profile details you provide.</li>
            <li><strong>Payment information</strong> — processed by Stripe; we do not store full card numbers.</li>
            <li><strong>Content</strong> — videos, streams, posts, and messages you create or upload.</li>
            <li><strong>Usage data</strong> — device, browser, pages viewed, and interactions, collected via analytics.</li>
          </ul>

          <h2>2. How we use information</h2>
          <ul>
            <li>To provide, maintain, and improve the Service.</li>
            <li>To process payments and creator payouts.</li>
            <li>To send transactional and, with consent, marketing emails.</li>
            <li>To detect, prevent, and address fraud and abuse.</li>
          </ul>

          <h2>3. Sharing</h2>
          <p>
            We share information with service providers that help us operate the
            Service (e.g., Stripe for payments, Mux for video, Supabase for
            hosting, Resend for email), and as required by law. We do not sell
            your personal information.
          </p>

          <h2>4. Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct,
            export, or delete your personal data. You can delete your account
            from Settings, or contact us at the address below.
          </p>

          <h2>5. Data retention &amp; security</h2>
          <p>
            We retain data for as long as your account is active or as needed to
            provide the Service and meet legal obligations. We use industry-
            standard measures to protect your data, though no method is 100%
            secure.
          </p>

          <h2>6. Children</h2>
          <p>The Service is not directed to children under 13 (or the minimum age in your jurisdiction).</p>

          <h2>7. Changes</h2>
          <p>We may update this policy and will post the revised date above.</p>

          <h2>8. Contact</h2>
          <p>Questions? Email <a href="mailto:privacy@uply.tv">privacy@uply.tv</a>.</p>
        </article>
      </div>
    </div>
  );
}
