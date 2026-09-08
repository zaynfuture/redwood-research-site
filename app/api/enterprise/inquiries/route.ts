import { admitLoginAttempt, createEnterpriseInquiry } from '@/lib/api/store';
import { boundedJson, error, json } from '@/lib/api/http';
import { normalizeEmail, sameOriginRequest } from '@/lib/api/security';

export const dynamic = 'force-dynamic';

const allowedNeeds = new Set(['equity_systems', 'internal_documents', 'im_delivery', 'custom_research']);
const allowedTeamSizes = new Set(['1-10', '11-50', '51-200', '201-1000', '1000+']);
const allowedTimelines = new Set(['exploring', '1-3_months', '3-6_months', '6+_months']);

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > max || value.includes('\0')) return undefined;
  return value.trim() || null;
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const source = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const attempts = await admitLoginAttempt(`enterprise-inquiry:${source}`);
  if (attempts === null || attempts > 4) return error('too_many_requests', 'Too many inquiries. Please try again later.', 429);

  const body = await boundedJson(request);
  const contactName = optionalText(body?.contact_name, 120);
  const workEmail = normalizeEmail(body?.work_email);
  const company = optionalText(body?.company, 180);
  const role = optionalText(body?.role, 120);
  const teamSize = optionalText(body?.team_size, 20);
  const timeline = optionalText(body?.timeline, 30);
  const message = optionalText(body?.message, 4000);
  const needs = body?.needs;
  if (!contactName || !workEmail || !company || role === undefined || teamSize === undefined ||
      timeline === undefined || !message || message.length < 10 || !Array.isArray(needs) ||
      needs.length < 1 || needs.length > allowedNeeds.size ||
      !needs.every((need) => typeof need === 'string' && allowedNeeds.has(need)) ||
      (teamSize !== null && !allowedTeamSizes.has(teamSize)) ||
      (timeline !== null && !allowedTimelines.has(timeline)) || body?.consent !== true) {
    return error('invalid_request', 'Please complete the required inquiry fields.', 400);
  }
  const id = await createEnterpriseInquiry({
    contactName,
    workEmail,
    company,
    role,
    teamSize,
    needs,
    timeline,
    message,
  });
  return json({ ok: true, inquiry_id: id }, 201);
}
