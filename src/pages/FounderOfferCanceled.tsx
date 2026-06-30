import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function FounderOfferCanceled() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-5">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto">
          <XCircle className="w-9 h-9 text-white/70" />
        </div>
        <h1 className="font-heading text-3xl font-bold mt-5">Checkout canceled.</h1>
        <p className="text-white/70 mt-3">
          No charge was made. You can come back and pick up where you left off whenever you're ready.
        </p>
        <div className="mt-7 flex flex-wrap gap-3 justify-center">
          <Link
            to="/founder-services"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#00FF85] text-black font-semibold text-sm hover:bg-[#00FF85]/90"
          >
            See tiers
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/20"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  );
}
