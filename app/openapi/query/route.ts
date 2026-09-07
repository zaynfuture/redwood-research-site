import { runPrivateTool } from '@/lib/api/backend';
import { boundedJson, error, json, requireUser, utcDate } from '@/lib/api/http';
import { validateInput } from '@/lib/api/security';
import { consumeQuota } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const user = await requireUser(request);
  if (!user) return error('unauthorized', 'A valid Bearer token is required.', 401);

  const body = await boundedJson(request);
  if (!body || Object.keys(body).some((key) => key !== 'input') || !validateInput(body.input)) {
    return error('invalid_request', 'Input must be 1–8,000 characters.', 400);
  }

  const remaining = await consumeQuota(user, utcDate());
  if (remaining === null) return error('quota_exhausted', 'Daily API quota exhausted.', 429);

  try {
    const result = await runPrivateTool(body.input.trim(), requestId);
    return json({ result, remaining, request_id: requestId });
  } catch (caught) {
    console.error(JSON.stringify({ event: 'redwood_api_upstream_error', request_id: requestId,
      error_type: caught instanceof Error ? caught.message : 'unknown' }));
    return json({ error: { code: 'service_unavailable', message: 'The research service is temporarily unavailable.' },
      request_id: requestId, remaining }, 503);
  }
}
