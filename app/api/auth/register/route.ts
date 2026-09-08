import { createEmailAccount } from '@/lib/api/store';
import { boundedJson, error } from '@/lib/api/http';
import { hashPassword, normalizeEmail, PASSWORD_ITERATIONS, randomHex, sameOriginRequest, validatePassword } from '@/lib/api/security';
import { signedInResponse } from '@/lib/auth/account';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const body = await boundedJson(request);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (!email || !validatePassword(password)) return error('invalid_request', 'Use a valid email and a password of 12–128 characters.', 400);
  const salt = randomHex(16);
  const user = await createEmailAccount(email, await hashPassword(password, salt, PASSWORD_ITERATIONS), salt, PASSWORD_ITERATIONS);
  if (!user) return error('account_exists', 'An account already exists for this email.', 409);
  return signedInResponse(user.id, { user });
}
