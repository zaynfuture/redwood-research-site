import { runPrivatePortfolio } from '@/lib/api/backend';
import { error, json } from '@/lib/api/http';
import {
  abandonRun, claimRun, decryptConnection, finishRun, getConnection, invalidateConnection, runHistory,
} from '@/lib/api/portfolio';
import { sameOriginRequest } from '@/lib/api/security';
import { requireFeature } from '@/lib/auth/features';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await requireFeature(request, 'portfolio');
  if (user instanceof Response) return user;
  const id = new URL(request.url).searchParams.get('id');
  const data = await runHistory(user.id, id);
  if (data === null) return error('not_found', 'Analysis not found.', 404);
  return json(id === null ? { runs: data } : { run: data });
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const user = await requireFeature(request, 'portfolio');
  if (user instanceof Response) return user;

  const connection = await getConnection(user.id);
  if (!connection) return error('connection_required', 'Save an IBKR Flex connection first.', 409);
  if (connection.state === 'invalid') return error('connection_invalid', 'Replace your Flex token or query ID.', 409);

  const id = crypto.randomUUID();
  if (!(await claimRun(user.id, connection.revision, id))) {
    return error('analysis_in_progress', 'An analysis is running or your connection has changed.', 409);
  }
  try {
    const credentials = await decryptConnection(user.id, connection);
    const { status, data } = await runPrivatePortfolio(request, credentials, id);
    const stillAllowed = await requireFeature(request, 'portfolio');
    if (stillAllowed instanceof Response) return stillAllowed;
    if (status === 422 && data.code === 'connection_invalid') {
      await invalidateConnection(user.id, connection.revision);
      return error('connection_invalid', 'IBKR rejected your Flex token or query ID. Replace the connection.', 409);
    }
    if (status === 422 && data.code === 'invalid_statement') {
      return error('invalid_statement', 'Configure an XML Activity Flex Query with Open Positions Summary for one account.', 422);
    }
    if (status !== 200 || !data.as_of || !Array.isArray(data.positions)) throw new Error('invalid_result');
    if (!(await finishRun(user.id, connection.revision, id, data))) {
      return error('connection_changed', 'Your connection changed during analysis. Run the analysis again.', 409);
    }
    const canRead = await requireFeature(request, 'portfolio');
    if (canRead instanceof Response) return canRead;
    return json({ id, result: data });
  } catch {
    return error('analysis_unavailable', 'Portfolio analysis is temporarily unavailable. Try again.', 503);
  } finally {
    await abandonRun(user.id, id);
  }
}
