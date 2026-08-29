import { useState, useEffect, useCallback } from 'react';
import { getStripe } from '@/lib/stripeClient';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { X, Loader2, ShieldCheck, TicketPercent, Plus, Check, Package } from 'lucide-react';

const stripePromise = getStripe();

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

interface BumpProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
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

  // Creator coupon ("Have a code?") — product checkouts only
  const isProduct = purchaseType === 'product';
  const productId: string | undefined = isProduct ? purchaseParams.product_id : undefined;
  const creatorId: string | undefined = isProduct ? purchaseParams.creator_id : undefined;
  const [couponInput, setCouponInput] = useState('');
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percentOff: number } | null>(null);

  // Order bump ("Add this too") — one cross-sell picked by the creator
  const [bumpProduct, setBumpProduct] = useState<BumpProduct | null>(null);
  const [bumpSelected, setBumpSelected] = useState(false);
  const [bumpLoading, setBumpLoading] = useState(false);

  // Reset per-open state
  useEffect(() => {
    if (!isOpen) return;
    setCouponInput('');
    setCouponOpen(false);
    setCouponError(null);
    setAppliedCoupon(null);
    setBumpProduct(null);
    setBumpSelected(false);
    setBumpLoading(false);
  }, [isOpen]);

  // Fetch the creator-configured bump product for this product (if any)
  useEffect(() => {
    if (!isOpen || !isProduct || !productId) return;
    let cancelled = false;
    (async () => {
      const { data: prod } = await (supabase as any)
        .from('products')
        .select('bump_product_id')
        .eq('id', productId)
        .maybeSingle();
      if (cancelled || !prod?.bump_product_id) return;
      const { data: bump } = await (supabase as any)
        .from('products')
        .select('id, name, price, image_url, status')
        .eq('id', prod.bump_product_id)
        .eq('status', 'active')
        .maybeSingle();
      if (!cancelled && bump && Number(bump.price) > 0) {
        setBumpProduct({ id: bump.id, name: bump.name, price: Number(bump.price), image_url: bump.image_url });
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, isProduct, productId]);

  useEffect(() => {
    if (!isOpen || !user) return;
    setClientSecret(null);
    setError(null);
    setComplete(false);

    // Bump selected → checkout goes through the cart path on demand instead
    // of an embedded single-product session; nothing to preload here.
    if (bumpSelected) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const functionMap: Record<string, string> = {
      ticket: 'stripe-create-event-checkout',
      subscription: 'stripe-create-checkout',
      product: 'stripe-create-product-checkout',
      platform: 'create-platform-checkout',
    };

    supabase.functions.invoke(functionMap[purchaseType], {
      body: {
        ...purchaseParams,
        embedded: true,
        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
      },
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
  }, [isOpen, user, purchaseType, JSON.stringify(purchaseParams), appliedCoupon?.code, bumpSelected]);

  const handleComplete = useCallback(() => {
    setComplete(true);
  }, []);

  // Pre-validate the code via the SECURITY DEFINER RPC for instant feedback;
  // stripe-create-product-checkout re-validates server-side regardless.
  const applyCoupon = useCallback(async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code || !creatorId || !productId) return;
    setCouponChecking(true);
    setCouponError(null);
    try {
      const { data, error: rpcErr } = await (supabase as any).rpc('validate_coupon', {
        p_creator_id: creatorId,
        p_code: code,
        p_product_id: productId,
      });
      const match = Array.isArray(data) ? data[0] : data;
      if (rpcErr || !match) {
        setCouponError("That code isn't valid for this product.");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({ code, percentOff: match.percent_off });
        setCouponInput('');
      }
    } catch {
      setCouponError('Could not check that code. Try again.');
    } finally {
      setCouponChecking(false);
    }
  }, [couponInput, creatorId, productId]);

  // Bump checkout reuses the battle-tested multi-item cart path:
  // create-cart-checkout → hosted Checkout → /shop?checkout=success →
  // CartCheckoutReturn → finalize-cart-order fulfills BOTH items.
  const checkoutWithBump = useCallback(async () => {
    if (!productId || !bumpProduct) return;
    setBumpLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-cart-checkout', {
        body: {
          items: [
            { product_id: productId, quantity: 1 },
            { product_id: bumpProduct.id, quantity: 1 },
          ],
        },
      });
      if (fnErr) throw fnErr;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout session returned');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not start checkout');
      setBumpLoading(false);
    }
  }, [productId, bumpProduct]);

  const discountedPrice = appliedCoupon
    ? Math.round(price * (100 - appliedCoupon.percentOff)) / 100
    : price;

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
            {appliedCoupon && !bumpSelected ? (
              <div className="flex items-center gap-2 mt-2">
                <p className="text-xl font-extrabold text-primary">${discountedPrice.toFixed(2)}</p>
                <p className="text-sm font-semibold text-muted-foreground line-through">${price}</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  <TicketPercent className="w-3 h-3" />
                  {appliedCoupon.code} −{appliedCoupon.percentOff}%
                  <button
                    onClick={() => setAppliedCoupon(null)}
                    className="ml-0.5 hover:text-foreground"
                    aria-label="Remove code"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            ) : (
              <p className="text-xl font-extrabold text-primary mt-2">
                ${bumpSelected && bumpProduct ? (price + bumpProduct.price).toFixed(2) : price}
              </p>
            )}

            {/* Have a code? — creator coupons, single-item product checkout only */}
            {isProduct && creatorId && productId && !appliedCoupon && !bumpSelected && (
              <div className="mt-3">
                {!couponOpen ? (
                  <button
                    onClick={() => setCouponOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <TicketPercent className="w-3.5 h-3.5" /> Have a code?
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                        placeholder="DISCOUNT CODE"
                        className="flex-1 h-9 px-3 rounded-lg bg-secondary/50 border border-border text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponChecking || !couponInput.trim()}
                        className="h-9 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground disabled:opacity-50"
                      >
                        {couponChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Order bump — "Add this too" */}
            {isProduct && bumpProduct && (
              <button
                onClick={() => setBumpSelected((s) => !s)}
                className={`mt-3 w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  bumpSelected ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30 hover:border-primary/40'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                  {bumpProduct.image_url ? (
                    <img src={bumpProduct.image_url} alt={bumpProduct.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Package className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">Add this too</p>
                  <p className="text-sm font-semibold text-foreground truncate">{bumpProduct.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-foreground">+${bumpProduct.price.toFixed(2)}</span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      bumpSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {bumpSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </button>
            )}
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

          {/* Bump selected → both items via the multi-item cart checkout */}
          {bumpSelected && bumpProduct && !complete && !error && (
            <div className="space-y-3 py-2">
              <button
                onClick={checkoutWithBump}
                disabled={bumpLoading}
                className="w-full px-6 py-3 rounded-xl text-sm font-extrabold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bumpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Checkout both — ${(price + bumpProduct.price).toFixed(2)}
              </button>
              <p className="text-[11px] text-center text-muted-foreground">
                You'll finish payment on a secure Stripe page. Discount codes apply to single-item checkout only.
              </p>
            </div>
          )}

          {clientSecret && !complete && !bumpSelected && (
            <EmbeddedCheckoutProvider
              key={clientSecret}
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
