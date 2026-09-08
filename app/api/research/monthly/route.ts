import { error, json, requireAccountUser } from '@/lib/api/http';
import { chatEnabled } from '@/lib/auth/account';
import { listPublishedMonthlyResearch } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  if (!chatEnabled(user)) return error('subscription_required', 'An active subscription is required.', 403);
  return json({ items: await listPublishedMonthlyResearch() });
}
