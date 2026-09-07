import { error, json, requireUser, utcDate } from '@/lib/api/http';
import { quota } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const user = await requireUser(request);
  if (!user) return error('unauthorized', 'A valid Bearer token is required.', 401);
  return json({ date: utcDate(), ...(await quota(user, utcDate())) });
}
