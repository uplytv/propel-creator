// Public: resolve TV QR token, log scan, create Stripe Checkout, redirect.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': "https://uply.tv",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyToken(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sig = Uint8Array.from(
      atob(s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((s.length + 2) % 4)),
      c => c.charCodeAt(0)
    );
    const ok = await crypto.subtle.verify('HMAC', key, sig, enc.encode(`${h}.${p}`));
    if (!ok) return null;
    const payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((p.length + 2) % 4)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || url.pathname.split('/').pop();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const payload = await verifyToken(token, secret);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secret);

  // Log scan
  await admin
    .from('tv_product_features')
    .update({ qr_scanned_at: new Date().toISOString() })
    .eq('checkout_token', token)
    .is('qr_scanned_at', null);

  // Look up product
  const { data: product } = await admin
    .from('products')
    .select('id, name, price, image_url, stripe_price_id, user_id')
    .eq('id', payload.product_id)
    .maybeSingle();
  if (!product) {
    return new Response('Product not found', { status: 404, headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2025-08-27.basil',
  });

  const origin = req.headers.get('origin') || 'https://uply.tv';
  const lineItem = product.stripe_price_id
    ? { price: product.stripe_price_id, quantity: 1 }
    : {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            images: product.image_url ? [product.image_url] : undefined,
          },
          unit_amount: Math.round(Number(product.price) * 100),
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [lineItem as any],
    success_url: `${origin}/tv/buy/success?token=${token}`,
    cancel_url: `${origin}/tv/buy/cancel`,
    metadata: {
      tv_token: token,
      stream_id: payload.stream_id,
      product_id: payload.product_id,
      source: 'uply_tv_qr',
    },
  });

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: session.url! },
  });
}));
