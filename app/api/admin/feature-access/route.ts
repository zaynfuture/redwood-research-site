import { env } from 'cloudflare:workers';
import { boundedJson, error, json, requireAccountUser } from '@/lib/api/http';
import { normalizeEmail, sameOriginRequest } from '@/lib/api/security';
import { type Feature, featureAccess, featureAccessHistory, features, isAdmin, recordFeatureAccess } from '@/lib/auth/features';

export const dynamic = 'force-dynamic';

async function targetFor(email: unknown) {
  const normalized = normalizeEmail(email);
  return normalized ? env.DB.prepare('SELECT id, email, google_sub IS NOT NULL AS google_linked FROM users WHERE email = ? AND enabled = 1')
    .bind(normalized).first<{ id: string; email: string; google_linked: number }>() : null;
}

export async function GET(request: Request) {
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  if (!isAdmin(user)) return error('forbidden', 'Administrator access required.', 403);
  const params = new URL(request.url).searchParams;
  const target = await targetFor(params.get('email'));
  if (!target) return error('account_not_found', 'Account not found.', 404);
  const rawBefore = params.get('before');
  const before = rawBefore === null ? null : Number(rawBefore);
  if (before !== null && (!Number.isSafeInteger(before) || before < 1)) {
    return error('invalid_cursor', 'Invalid history cursor.', 400);
  }
  const history = await featureAccessHistory(target.id, before);
  if (before !== null) return json(history);
  return json({ ...target, admin: isAdmin(target), features: await featureAccess(target), ...history });
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  if (!isAdmin(user)) return error('forbidden', 'Administrator access required.', 403);
  const body = await boundedJson(request);
  const feature = body?.feature as Feature;
  const action = body?.action;
  if (!features.includes(feature) || (action !== 'grant' && action !== 'revoke')) {
    return error('invalid_request', 'Choose a feature and an action.', 400);
  }
  const date = body?.expiresOn;
  let expiresAt = null;
  if (date !== null && date !== undefined && date !== '') {
    if (action !== 'grant' || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return error('invalid_expiry', 'Choose a valid expiration date.', 400);
    }
    const parsed = new Date(date + 'T23:59:59.999Z');
    if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== date || +parsed <= Date.now()) {
      return error('invalid_expiry', 'Choose a current or future expiration date.', 400);
    }
    expiresAt = parsed.toISOString();
  }
  const target = await targetFor(body?.email);
  if (!target) return error('account_not_found', 'Account not found.', 404);
  if (body?.targetId !== target.id) return error('account_changed', 'Look up the account again before changing access.', 409);
  if (isAdmin(target)) return error('admin_access_fixed', 'Administrators have all features by role.', 409);
  await recordFeatureAccess({ userId: target.id, feature, action, source: 'manual', actorUserId: user.id, expiresAt });
  return json({
    ...target, admin: false, features: await featureAccess(target),
    ...await featureAccessHistory(target.id, null),
  });
}
