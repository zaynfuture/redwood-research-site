import { admitLoginAttempt, findUser } from '@/lib/api/store';
import { boundedJson, error } from '@/lib/api/http';
import { hashPassword, normalizeEmail, PASSWORD_ITERATIONS, safeEqualHex, sameOriginRequest, validatePassword } from '@/lib/api/security';
import { turnstileConfigured, verifyTurnstile } from '@/lib/api/turnstile';
import { signedInResponse } from '@/lib/auth/account';

export const dynamic = 'force-dynamic';
const DUMMY_SALT = '00000000000000000000000000000000';
const DUMMY_HASH = '172f81f1783a4b3d6dca10e203859b66e9d27d34218d9c3788bb79d88de4b20d';

export async function POST(request: Request): Promise<Response> {
  if (!sameOriginRequest(request)) return error('forbidden', 'Invalid request origin.', 403);
  const body = await boundedJson(request);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (!email || !validatePassword(password)) return error('invalid_request', 'Invalid request.', 400);
  const source = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!turnstileConfigured()) {
    return error('captcha_unavailable', 'Human verification is temporarily unavailable.', 503);
  }
  if (!(await verifyTurnstile(body?.turnstile_token, source))) {
    return error('captcha_required', 'Complete human verification before signing in.', 403);
  }
  const attempts = await admitLoginAttempt(source);
  if (attempts === null) return error('too_many_attempts', 'Too many login attempts. Try again later.', 429);
  const user = await findUser(email);
  const candidate = await hashPassword(password, user?.passwordSalt ?? DUMMY_SALT, user?.passwordIterations ?? PASSWORD_ITERATIONS);
  if (!user || !(await safeEqualHex(candidate, user.passwordHash ?? DUMMY_HASH))) return error('invalid_credentials', 'Email or password is incorrect.', 401);
  return signedInResponse(user.id, { ok: true });
}
