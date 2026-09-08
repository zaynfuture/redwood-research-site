import { error, requireAccountUser } from '@/lib/api/http';
import { sameOriginRequest } from '@/lib/api/security';
import { createCheckoutSession } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  try {
    const url = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      customerId: user.stripeCustomerId,
      origin: new URL(request.url).origin,
    });
    return Response.json({ url }, { headers: { 'cache-control': 'no-store' } });
  } catch (caught) {
    console.error(JSON.stringify({ event: 'stripe_checkout_error', error_type: caught instanceof Error ? caught.message : 'unknown' }));
    return error('billing_unavailable', 'Billing is temporarily unavailable.', 503);
  }
}
