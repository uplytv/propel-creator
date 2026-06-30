import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import FounderOffersPricing from "@/components/founderoffers/FounderOffersPricing";

export default function FounderServices() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-6xl mx-auto px-5 pt-8 pb-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back home
        </Link>
        <div className="mt-10" id="done-for-you">
          <FounderOffersPricing variant="full" source="founder_services_page" />
        </div>

        <div className="mt-16 rounded-2xl bg-white/[0.03] border border-white/10 p-6 sm:p-8 max-w-3xl mx-auto">
          <h3 className="font-heading text-xl font-bold mb-3">What happens after I pay?</h3>
          <ol className="space-y-3 text-sm text-white/75 list-decimal list-inside">
            <li>You'll get an instant confirmation email with your receipt.</li>
            <li>A UPLY rep reaches out within 1 business day to schedule a kickoff call.</li>
            <li>You hand off your content (videos, notes, ideas) and approve the course outline.</li>
            <li>We build, upload, and publish. You launch.</li>
          </ol>
          <p className="text-xs text-white/40 mt-5">
            Questions before buying? Email <a href="mailto:founders@uply.tv" className="underline hover:text-white">founders@uply.tv</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
