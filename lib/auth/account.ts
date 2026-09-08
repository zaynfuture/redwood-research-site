import { createAccountSession } from '@/lib/api/store';
import { randomHex, sessionCookie } from '@/lib/api/security';

export const ACCOUNT_SESSION_SECONDS = 60 * 60 * 24 * 30;

export async function signedInResponse(userId: string, data: Record<string, unknown> = {}): Promise<Response> {
  const token = randomHex();
  const expiresAt = new Date(Date.now() + ACCOUNT_SESSION_SECONDS * 1000).toISOString();
  await createAccountSession(userId, token, expiresAt);
  return Response.json(data, {
    headers: {
      'cache-control': 'no-store',
      'set-cookie': sessionCookie(token, ACCOUNT_SESSION_SECONDS),
      'x-content-type-options': 'nosniff',
    },
  });
}

export function chatEnabled(user: { plan: string; subscriptionStatus: string }): boolean {
  return user.plan === 'legacy' || user.plan === 'enterprise' ||
    (user.plan === 'individual' && ['active', 'trialing'].includes(user.subscriptionStatus));
}

export function usageMonth(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}
