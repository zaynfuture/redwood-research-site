import { boundedJson, error, json, requireAccountUser } from '@/lib/api/http';
import { getConnection, removeConnection, saveConnection } from '@/lib/api/portfolio';
import { sameOriginRequest } from '@/lib/api/security';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  const connection = await getConnection(user.id);
  return json({ connection: connection && { state: connection.state, updated_at: connection.updated_at } });
}

export async function PUT(request: Request) {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  const body = await boundedJson(request, 1024);
  const token = body?.token;
  const queryId = body?.queryId;
  if (typeof token !== 'string' || !/^[0-9]{1,64}$/.test(token) ||
      typeof queryId !== 'string' || !/^[0-9]{1,32}$/.test(queryId)) {
    return error('invalid_request', 'Enter a numeric Flex token and query ID.', 400);
  }
  try {
    return json({ connection: await saveConnection(user.id, { token, query_id: queryId }) });
  } catch {
    return error('connection_unavailable', 'Unable to save your connection.', 503);
  }
}

export async function DELETE(request: Request) {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  await removeConnection(user.id);
  return json({ connection: null });
}
