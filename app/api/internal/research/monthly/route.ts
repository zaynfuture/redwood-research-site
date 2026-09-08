import { boundedJson, error, json } from '@/lib/api/http';
import { safeEqualHex } from '@/lib/api/security';
import { upsertMonthlyResearch, type MonthlyResearchItem } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !value.includes('\0');
}

function evidence(value: unknown): value is MonthlyResearchItem['evidence'] {
  return Array.isArray(value) && value.length <= 30 && value.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return text(record.id, 200) && text(record.label, 300) &&
      (record.locator === undefined || text(record.locator, 500));
  });
}

export async function PUT(request: Request): Promise<Response> {
  const configured = process.env.REDWOOD_PUBLISH_TOKEN;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!configured || !supplied || !(await safeEqualHex(configured, supplied))) {
    return error('unauthorized', 'A valid publishing credential is required.', 401);
  }
  const body = await boundedJson(request, 32_768);
  if (!body || !text(body.period, 7) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.period) ||
      (body.kind !== 'stock_analysis' && body.kind !== 'market_outlook') ||
      !text(body.title, 180) || !text(body.summary, 600) || !text(body.body, 20_000) ||
      !evidence(body.evidence) || typeof body.publish !== 'boolean' ||
      (body.publish && body.evidence.length === 0)) {
    return error('invalid_request', 'The monthly research payload is invalid.', 400);
  }
  await upsertMonthlyResearch({
    period: body.period,
    kind: body.kind,
    title: body.title.trim(),
    summary: body.summary.trim(),
    body: body.body.trim(),
    evidence: body.evidence,
    publish: body.publish,
  });
  return json({ ok: true, period: body.period, kind: body.kind, status: body.publish ? 'published' : 'draft' });
}
