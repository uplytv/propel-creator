import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { X, Loader2, ShieldCheck } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PurchaseOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  purchaseType: 'ticket' | 'subscription' | 'product' | 'platform';
  purchaseParams: Record<string, any>;
  title: string;
  description?: string;
  price: number;
}

export function PurchaseOverlay({
  isOpen, onClose, onSuccess,
  purchaseType, purchaseParams, title, description, price
}: PurchaseOverlayProps) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setClientSecret(null);
    setError(null);
    setComplete(false);
    setLoading(true);

    const functionMap: Record<string, string> = {
      ticket: 'stripe-create-event-checkout',
      subscription: 'stripe-create-checkout',
      product: 'stripe-create-product-checkout',
      platform: 'create-platform-checkout',
    };

    supabase.functions.invoke(functionMap[purchaseType], {
      body: { ...purchaseParams, embedded: true },
    })
      .then(({ data, error: fnErr }) => {
        if (fnErr) throw fnErr;
        if (data?.client_secret) {
          setClientSecret(data.client_secret);
        } else if (data?.url) {
          // Fallback: function doesn't support embedded mode yet, open in new tab
          window.open(data.url, '_blank');
          onClose();
        } else {
          throw new Error('No checkout session returned');
        }
      })
      .catch((err: any) => {
        setError(err?.message || 'Could not load checkout');
      })
      .finally(() => setLoading(false));
  }, [isOpen, user, purchaseType, JSON.stringify(purchaseParams)]);

  const handleComplete = useCallback(() => {
    setComplete(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Product info header */}
        {!complete && (
          <div className="p-5 pb-3 border-b border-border">
            <h3 className="text-lg font-bold text-foreground pr-8">{title}</h3>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            <p className="text-xl font-extrabold text-primary mt-2">${price}</p>
          </div>
        )}

        {/* States */}
        <div className="p-5">
          {loading && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading checkout...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Close and try again
              </button>
            </div>
          )}

          {complete && (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">🎉</p>
              <h3 className="text-xl font-bold text-foreground mb-2">Purchase Complete!</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {purchaseType === 'ticket' && 'Your ticket is saved in My Tickets'}
                {purchaseType === 'subscription' && 'You now have access to the community'}
                {purchaseType === 'product' && 'Your purchase is ready to access'}
                {purchaseType === 'platform' && 'Your plan has been upgraded'}
              </p>
              <button
                onClick={() => { onSuccess?.(); onClose(); }}
                className="w-full px-6 py-3 rounded-xl text-sm font-extrabold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                ✓ Close and Keep Watching
              </button>
            </div>
          )}

          {clientSecret && !complete && (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ clientSecret, onComplete: handleComplete }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>

        {!complete && (
          <div className="flex items-center justify-center gap-1.5 pb-4 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secured by Stripe
          </div>
        )}
      </div>
    </div>
  );
}
