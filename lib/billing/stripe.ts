import { safeEqualHex } from '@/lib/api/security';

export async function createCheckoutSession(input: {
  userId: string;
  email: string;
  customerId: string | null;
  origin: string;
}): Promise<string> {
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_INDIVIDUAL_PRICE_ID;
  if (!secret || !priceId) throw new Error('billing_not_configured');

  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'payment_method_types[0]': 'card',
    client_reference_id: input.userId,
    'metadata[user_id]': input.userId,
    'subscription_data[metadata][user_id]': input.userId,
    success_url: `${input.origin}/dashboard?checkout=success`,
    cancel_url: `${input.origin}/pricing?checkout=canceled`,
    allow_promotion_codes: 'true',
  });
  if (input.customerId) body.set('customer', input.customerId);
  else body.set('customer_email', input.email);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await response.json<{ url?: string; error?: { message?: string } }>();
  if (!response.ok || !data.url) throw new Error(data.error?.message ?? 'checkout_failed');
  return data.url;
}

export async function verifyStripeSignature(payload: string, signatureHeader: string): Promise<boolean> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return false;
  const values = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=', 2)));
  const timestamp = Number(values.t);
  const signature = values.v1;
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  const expected = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return safeEqualHex(expected, signature);
}
