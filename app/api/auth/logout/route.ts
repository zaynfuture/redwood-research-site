import { deleteAccountSession } from '@/lib/api/store';
import { clearSessionCookie, cookieValue, sameOriginRequest } from '@/lib/api/security';
import { error } from '@/lib/api/http';

export async function POST(request: Request): Promise<Response> {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const token = cookieValue(request, 'redwood_session');
  if (token) await deleteAccountSession(token);
  return Response.json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie(), 'cache-control': 'no-store' } });
}
