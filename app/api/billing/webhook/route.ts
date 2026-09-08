import { recordStripeEvent, stripeEventProcessed, updateStripeSubscription } from '@/lib/api/store';
import { verifyStripeSignature } from '@/lib/billing/stripe';

export const dynamic = 'force-dynamic';

interface StripeObject {
  id?: string;
  customer?: string;
  subscription?: string;
  payment_status?: string;
  status?: string;
  current_period_end?: number;
  metadata?: { user_id?: string };
}

function status(value?: string): 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive' {
  if (value === 'active' || value === 'trialing' || value === 'past_due' || value === 'canceled') return value;
  return 'inactive';
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';
  if (!(await verifyStripeSignature(payload, signature))) return new Response('Invalid signature', { status: 400 });
  const event = JSON.parse(payload) as { id: string; type: string; created: number; data: { object: StripeObject } };
  if (await stripeEventProcessed(event.id)) return Response.json({ received: true });
  const object = event.data.object;
  if (event.type === 'checkout.session.completed') {
    await updateStripeSubscription({
      userId: object.metadata?.user_id ?? null,
      customerId: object.customer ?? null,
      subscriptionId: object.subscription ?? null,
      status: object.payment_status === 'paid' || object.payment_status === 'no_payment_required' ? 'active' : 'inactive',
      eventCreated: event.created,
    });
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    await updateStripeSubscription({
      customerId: object.customer ?? null,
      subscriptionId: object.id ?? null,
      status: event.type === 'customer.subscription.deleted' ? 'canceled' : status(object.status),
      periodEnd: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
      eventCreated: event.created,
    });
  }
  await recordStripeEvent(event.id, event.type);
  return Response.json({ received: true });
}
