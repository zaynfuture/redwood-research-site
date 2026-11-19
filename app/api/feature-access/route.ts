import { error, json, requireAccountUser } from '@/lib/api/http';
import { featureAccess, isAdmin } from '@/lib/auth/features';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  return json({ admin: isAdmin(user), features: await featureAccess(user) });
}
