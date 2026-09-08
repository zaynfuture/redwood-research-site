import { runPrivateTool } from '@/lib/api/backend';
import { boundedJson, error, json, requireAccountUser } from '@/lib/api/http';
import { consumeMonthlyChatQuota } from '@/lib/api/store';
import { validateInput } from '@/lib/api/security';
import { chatEnabled, usageMonth } from '@/lib/auth/account';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  if (!chatEnabled(user)) return error('subscription_required', 'An active subscription is required.', 403);
  const body = await boundedJson(request);
  if (!body || Object.keys(body).some((key) => key !== 'input') || !validateInput(body.input)) {
    return error('invalid_request', 'Input must be 1–8,000 characters.', 400);
  }
  const remaining = await consumeMonthlyChatQuota(user.id, usageMonth());
  if (remaining === null) return error('quota_exhausted', 'Monthly chatbot quota exhausted.', 429);
  const requestId = crypto.randomUUID();
  try {
    const result = await runPrivateTool(body.input.trim(), requestId);
    return json({ result, remaining, request_id: requestId });
  } catch (caught) {
    console.error(JSON.stringify({ event: 'redwood_chat_upstream_error', request_id: requestId,
      error_type: caught instanceof Error ? caught.message : 'unknown' }));
    return json({ error: { code: 'service_unavailable', message: 'The research service is temporarily unavailable.' },
      request_id: requestId, remaining }, 503);
  }
}
