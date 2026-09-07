import { env } from 'cloudflare:workers';
import { sha256 } from './security';

export interface AuthenticatedUser {
  id: string;
  email: string;
  dailyLimit: number;
}

export interface StoredUser extends AuthenticatedUser {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  daily_limit: number;
}

export async function findUser(email: string): Promise<StoredUser | null> {
  const row = await env.DB.prepare(
    `SELECT id, email, password_hash, password_salt, password_iterations, daily_limit
     FROM users WHERE email = ? AND enabled = 1`,
  ).bind(email).first<UserRow>();
  return row ? {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    passwordIterations: row.password_iterations,
    dailyLimit: row.daily_limit,
  } : null;
}

export async function createSession(userId: string, token: string, expiresAt: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO api_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).bind(await sha256(token), userId, expiresAt, new Date().toISOString()).run();
}

export async function authenticate(token: string): Promise<AuthenticatedUser | null> {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.daily_limit
     FROM api_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.enabled = 1`,
  ).bind(await sha256(token), new Date().toISOString()).first<{ id: string; email: string; daily_limit: number }>();
  return row ? { id: row.id, email: row.email, dailyLimit: row.daily_limit } : null;
}

export async function quota(user: AuthenticatedUser, date: string): Promise<{ limit: number; used: number; remaining: number }> {
  const row = await env.DB.prepare(
    'SELECT used FROM daily_api_usage WHERE user_id = ? AND usage_date = ?',
  ).bind(user.id, date).first<{ used: number }>();
  const used = row?.used ?? 0;
  return { limit: user.dailyLimit, used, remaining: Math.max(0, user.dailyLimit - used) };
}

export async function consumeQuota(user: AuthenticatedUser, date: string): Promise<number | null> {
  const row = await env.DB.prepare(
    `INSERT INTO daily_api_usage (user_id, usage_date, used) VALUES (?, ?, 1)
     ON CONFLICT(user_id, usage_date) DO UPDATE SET used = used + 1
     WHERE used < ? RETURNING used`,
  ).bind(user.id, date, user.dailyLimit).first<{ used: number }>();
  return row ? user.dailyLimit - row.used : null;
}

export async function admitLoginAttempt(identity: string, now = new Date()): Promise<boolean> {
  const identityHash = await sha256(identity);
  const windowMs = 15 * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  const row = await env.DB.prepare(
    `INSERT INTO login_attempts (identity_hash, window_start, attempts) VALUES (?, ?, 1)
     ON CONFLICT(identity_hash, window_start) DO UPDATE SET attempts = attempts + 1
     WHERE attempts < 10 RETURNING attempts`,
  ).bind(identityHash, windowStart).first<{ attempts: number }>();
  return row !== null;
}
