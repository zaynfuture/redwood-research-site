import { env } from 'cloudflare:workers';
import { error, requireAccountUser } from '@/lib/api/http';
import type { AccountUser } from '@/lib/api/store';

export const features = ['portfolio', 'volume_profile', 'market_sentiment'] as const;
export type Feature = (typeof features)[number];

type AccessEvent = {
  feature: Feature;
  action: 'grant' | 'revoke';
  source: 'manual' | 'payment';
  created_at: string;
  expires_at: string | null;
};

export function isAdmin(user: Pick<AccountUser, 'id'>): boolean {
  return (process.env.REDWOOD_ADMIN_USER_IDS ?? '').split(',').some(id => id.trim() === user.id);
}

export async function featureAccess(user: Pick<AccountUser, 'id'>) {
  const { results } = await env.DB.prepare(
    `SELECT feature, action, source, created_at, expires_at FROM feature_access_events
     WHERE user_id = ? AND sequence IN (
       SELECT MAX(sequence) FROM feature_access_events WHERE user_id = ? GROUP BY feature
     )`,
  ).bind(user.id, user.id).all<AccessEvent>();
  const now = new Date().toISOString();
  return Object.fromEntries(features.map(feature => {
    const event = results.find(row => row.feature === feature);
    const expired = event?.action === 'grant' && event.expires_at !== null && event.expires_at <= now;
    return [feature, {
      allowed: isAdmin(user) || (event?.action === 'grant' && !expired),
      expired,
      event: event ?? null,
    }];
  })) as Record<Feature, { allowed: boolean; expired: boolean; event: AccessEvent | null }>;
}

export async function requireFeature(request: Request, feature: Feature): Promise<AccountUser | Response> {
  const user = await requireAccountUser(request);
  if (!user) return error('unauthorized', 'Sign in required.', 401);
  if (isAdmin(user)) return user;
  const access = (await featureAccess(user))[feature];
  if (access.allowed) return user;
  return access.expired
    ? error('access_expired', 'Your access has expired.', 403)
    : error('feature_not_granted', 'This feature requires administrator approval.', 403);
}

export async function featureAccessHistory(userId: string, before: number | null) {
  const limit = 25;
  type HistoryEvent = AccessEvent & { sequence: number; actor_email: string | null };
  const { results } = await env.DB.prepare(
    `SELECT e.sequence, e.feature, e.action, e.source, e.created_at, e.expires_at, a.email AS actor_email
     FROM feature_access_events e LEFT JOIN users a ON a.id = e.actor_user_id
     WHERE e.user_id = ? AND (? IS NULL OR e.sequence < ?)
     ORDER BY e.sequence DESC LIMIT ?`,
  ).bind(userId, before, before, limit + 1).all<HistoryEvent>();
  const history = results.slice(0, limit);
  return { history, next_before: results.length > limit ? history[limit - 1].sequence : null };
}

export async function recordFeatureAccess(input: {
  userId: string;
  feature: Feature;
  action: AccessEvent['action'];
  source: AccessEvent['source'];
  actorUserId: string | null;
  expiresAt: string | null;
}) {
  await env.DB.prepare(
    `INSERT INTO feature_access_events (user_id, feature, action, source, actor_user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(input.userId, input.feature, input.action, input.source,
    input.actorUserId, new Date().toISOString(), input.expiresAt).run();
}
