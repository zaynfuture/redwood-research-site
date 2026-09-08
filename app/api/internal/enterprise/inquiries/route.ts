import { error, json } from '@/lib/api/http';
import { safeEqualHex } from '@/lib/api/security';
import { listEnterpriseInquiries } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const configured = process.env.REDWOOD_ENTERPRISE_INBOX_TOKEN;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!configured || !supplied || !(await safeEqualHex(configured, supplied))) {
    return error('unauthorized', 'A valid inbox credential is required.', 401);
  }
  const requested = Number(new URL(request.url).searchParams.get('limit') ?? '50');
  const limit = Number.isInteger(requested) ? Math.min(100, Math.max(1, requested)) : 50;
  return json({ inquiries: await listEnterpriseInquiries(limit) });
}
