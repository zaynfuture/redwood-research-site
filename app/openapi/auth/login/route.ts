import { admitLoginAttempt, createSession, findUser } from '@/lib/api/store';
import { boundedJson, error, json } from '@/lib/api/http';
import {
  hashPassword,
  normalizeEmail,
  randomHex,
  safeEqualHex,
  validatePassword,
} from '@/lib/api/security';

export const dynamic = 'force-dynamic';

const DUMMY_SALT = '00000000000000000000000000000000';
const DUMMY_HASH = '172f81f1783a4b3d6dca10e203859b66e9d27d34218d9c3788bb79d88de4b20d';

export async function POST(request: Request): Promise<Response> {
  const body = await boundedJson(request);
  const email = normalizeEmail(body?.email);
  const password = body?.password;
  if (!email || !validatePassword(password)) return error('invalid_request', 'Invalid request.', 400);
  const source = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await admitLoginAttempt(`${source}:${email}`))) {
    return error('too_many_attempts', 'Too many login attempts. Try again later.', 429);
  }

  const user = await findUser(email);
  const candidate = await hashPassword(
    password,
    user?.passwordSalt ?? DUMMY_SALT,
    user?.passwordIterations ?? 210_000,
  );
  const valid = await safeEqualHex(candidate, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return error('invalid_credentials', 'Email or password is incorrect.', 401);

  const token = randomHex();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await createSession(user.id, token, expiresAt);
  return json({ access_token: token, token_type: 'Bearer', expires_at: expiresAt });
}
