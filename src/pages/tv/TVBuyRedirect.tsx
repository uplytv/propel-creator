import { useEffect } from "react";
import { useParams } from "react-router-dom";

/**
 * Phone-side QR landing. Redirects to the tv-checkout-resolve edge function,
 * which validates the signed token, creates a Stripe Checkout session, and
 * 302-redirects the phone browser to Stripe.
 */
export default function TVBuyRedirect() {
  const { token } = useParams<{ token: string }>();
  useEffect(() => {
    if (!token) return;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    window.location.replace(
      `https://${projectId}.supabase.co/functions/v1/tv-checkout-resolve?token=${encodeURIComponent(token)}`
    );
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <div className="w-12 h-12 border-4 border-[#3D7CFF] border-t-transparent rounded-full animate-spin mb-6" />
      <h1 className="text-xl font-bold mb-2">Opening secure checkout…</h1>
      <p className="opacity-60 text-sm">You'll be redirected to complete your purchase.</p>
    </div>
  );
}
