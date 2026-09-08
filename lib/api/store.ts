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

export interface AccountUser {
  id: string;
  email: string;
  displayName: string | null;
  plan: 'free' | 'individual' | 'enterprise' | 'legacy';
  subscriptionStatus: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled';
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
}

interface AccountUserRow {
  id: string;
  email: string;
  display_name: string | null;
  plan: AccountUser['plan'];
  subscription_status: AccountUser['subscriptionStatus'];
  stripe_customer_id: string | null;
  current_period_end: string | null;
}

function accountUser(row: AccountUserRow): AccountUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    plan: row.plan,
    subscriptionStatus: row.subscription_status,
    stripeCustomerId: row.stripe_customer_id,
    currentPeriodEnd: row.current_period_end,
  };
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

export async function createAccountSession(userId: string, token: string, expiresAt: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO account_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).bind(await sha256(token), userId, expiresAt, new Date().toISOString()).run();
}

export async function deleteAccountSession(token: string): Promise<void> {
  await env.DB.prepare('DELETE FROM account_sessions WHERE token_hash = ?')
    .bind(await sha256(token)).run();
}

export async function authenticateAccountSession(token: string): Promise<AccountUser | null> {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.plan, u.subscription_status,
            u.stripe_customer_id, u.current_period_end
     FROM account_sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.enabled = 1`,
  ).bind(await sha256(token), new Date().toISOString()).first<AccountUserRow>();
  return row ? accountUser(row) : null;
}

export async function createEmailAccount(email: string, passwordHash: string, passwordSalt: string, passwordIterations: number): Promise<AccountUser | null> {
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO users
       (id, email, password_hash, password_salt, password_iterations, enabled, daily_limit, created_at,
        plan, subscription_status)
       VALUES (?, ?, ?, ?, ?, 1, 100, ?, 'free', 'inactive')`,
    ).bind(id, email, passwordHash, passwordSalt, passwordIterations, new Date().toISOString()).run();
  } catch (caught) {
    if (String(caught).toLowerCase().includes('unique')) return null;
    throw caught;
  }
  return getAccountUserById(id);
}

export async function findOrCreateGoogleAccount(input: { email: string; sub: string; displayName: string | null }): Promise<AccountUser> {
  const existing = await env.DB.prepare(
    `SELECT id, email, display_name, plan, subscription_status, stripe_customer_id, current_period_end
     FROM users WHERE google_sub = ? OR email = ? LIMIT 1`,
  ).bind(input.sub, input.email).first<AccountUserRow>();
  if (existing) {
    await env.DB.prepare(
      'UPDATE users SET google_sub = COALESCE(google_sub, ?), display_name = COALESCE(?, display_name) WHERE id = ?',
    ).bind(input.sub, input.displayName, existing.id).run();
    return { ...accountUser(existing), displayName: input.displayName ?? existing.display_name };
  }

  const salt = crypto.randomUUID().replaceAll('-', '');
  const unusablePasswordHash = await sha256(crypto.randomUUID());
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users
     (id, email, password_hash, password_salt, password_iterations, enabled, daily_limit, created_at,
      display_name, google_sub, plan, subscription_status)
     VALUES (?, ?, ?, ?, 100000, 1, 100, ?, ?, ?, 'free', 'inactive')`,
  ).bind(id, input.email, unusablePasswordHash, salt, new Date().toISOString(), input.displayName, input.sub).run();
  return (await getAccountUserById(id))!;
}

export async function getAccountUserById(id: string): Promise<AccountUser | null> {
  const row = await env.DB.prepare(
    `SELECT id, email, display_name, plan, subscription_status, stripe_customer_id, current_period_end
     FROM users WHERE id = ? AND enabled = 1`,
  ).bind(id).first<AccountUserRow>();
  return row ? accountUser(row) : null;
}

export async function storeOAuthState(state: string, nonce: string, expiresAt: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO oauth_states (state_hash, nonce, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).bind(await sha256(state), nonce, expiresAt, new Date().toISOString()).run();
}

export async function consumeOAuthState(state: string): Promise<string | null> {
  const stateHash = await sha256(state);
  const row = await env.DB.prepare(
    'SELECT nonce FROM oauth_states WHERE state_hash = ? AND expires_at > ?',
  ).bind(stateHash, new Date().toISOString()).first<{ nonce: string }>();
  await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash = ?').bind(stateHash).run();
  return row?.nonce ?? null;
}

export async function monthlyChatQuota(userId: string, month: string, limit = 1000): Promise<{ limit: number; used: number; remaining: number }> {
  const row = await env.DB.prepare(
    'SELECT used FROM monthly_chat_usage WHERE user_id = ? AND usage_month = ?',
  ).bind(userId, month).first<{ used: number }>();
  const used = row?.used ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

export async function consumeMonthlyChatQuota(userId: string, month: string, limit = 1000): Promise<number | null> {
  const row = await env.DB.prepare(
    `INSERT INTO monthly_chat_usage (user_id, usage_month, used) VALUES (?, ?, 1)
     ON CONFLICT(user_id, usage_month) DO UPDATE SET used = used + 1
     WHERE used < ? RETURNING used`,
  ).bind(userId, month, limit).first<{ used: number }>();
  return row ? limit - row.used : null;
}

export async function recordStripeEvent(eventId: string, eventType: string): Promise<boolean> {
  try {
    await env.DB.prepare(
      'INSERT INTO stripe_events (event_id, event_type, processed_at) VALUES (?, ?, ?)',
    ).bind(eventId, eventType, new Date().toISOString()).run();
    return true;
  } catch (caught) {
    if (String(caught).toLowerCase().includes('unique')) return false;
    throw caught;
  }
}

export async function stripeEventProcessed(eventId: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT 1 AS found FROM stripe_events WHERE event_id = ?')
    .bind(eventId).first<{ found: number }>();
  return row?.found === 1;
}

export async function updateStripeSubscription(input: {
  userId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  status: AccountUser['subscriptionStatus'];
  periodEnd?: string | null;
  eventCreated: number;
}): Promise<void> {
  const where = input.userId ? 'id = ?' : 'stripe_customer_id = ?';
  const match = input.userId ?? input.customerId;
  if (!match) return;
  await env.DB.prepare(
    `UPDATE users SET plan = 'individual', subscription_status = ?,
     stripe_customer_id = COALESCE(?, stripe_customer_id),
     stripe_subscription_id = COALESCE(?, stripe_subscription_id),
     current_period_end = COALESCE(?, current_period_end),
     billing_event_created = ?
     WHERE ${where} AND billing_event_created <= ?`,
  ).bind(input.status, input.customerId, input.subscriptionId, input.periodEnd ?? null,
    input.eventCreated, match, input.eventCreated).run();
}

export interface MonthlyResearchItem {
  period: string;
  kind: 'stock_analysis' | 'market_outlook';
  title: string;
  summary: string;
  body: string;
  evidence: Array<{ id: string; label: string; locator?: string }>;
  publishedAt: string;
}

interface MonthlyResearchRow {
  period: string;
  kind: MonthlyResearchItem['kind'];
  title: string;
  summary: string;
  body: string;
  evidence_json: string;
  published_at: string;
}

export async function listPublishedMonthlyResearch(limit = 6): Promise<MonthlyResearchItem[]> {
  const result = await env.DB.prepare(
    `SELECT period, kind, title, summary, body, evidence_json, published_at
     FROM monthly_research WHERE status = 'published'
     ORDER BY period DESC, kind ASC LIMIT ?`,
  ).bind(limit).all<MonthlyResearchRow>();
  return result.results.map((row) => ({
    period: row.period,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    body: row.body,
    evidence: JSON.parse(row.evidence_json) as MonthlyResearchItem['evidence'],
    publishedAt: row.published_at,
  }));
}

export async function upsertMonthlyResearch(input: Omit<MonthlyResearchItem, 'publishedAt'> & { publish: boolean }): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO monthly_research
     (period, kind, title, summary, body, evidence_json, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(period, kind) DO UPDATE SET
       title = excluded.title,
       summary = excluded.summary,
       body = excluded.body,
       evidence_json = excluded.evidence_json,
       status = excluded.status,
       published_at = excluded.published_at,
       updated_at = excluded.updated_at`,
  ).bind(
    input.period,
    input.kind,
    input.title,
    input.summary,
    input.body,
    JSON.stringify(input.evidence),
    input.publish ? 'published' : 'draft',
    input.publish ? now : null,
    now,
    now,
  ).run();
}

export interface EnterpriseInquiry {
  id: string;
  contactName: string;
  workEmail: string;
  company: string;
  role: string | null;
  teamSize: string | null;
  needs: string[];
  timeline: string | null;
  message: string;
  status: 'new' | 'reviewing' | 'contacted' | 'closed';
  createdAt: string;
}

export async function createEnterpriseInquiry(input: Omit<EnterpriseInquiry, 'id' | 'status' | 'createdAt'>): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO enterprise_inquiries
     (id, contact_name, work_email, company, role, team_size, needs_json, timeline, message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
  ).bind(id, input.contactName, input.workEmail, input.company, input.role, input.teamSize,
    JSON.stringify(input.needs), input.timeline, input.message, now, now).run();
  return id;
}

interface EnterpriseInquiryRow {
  id: string;
  contact_name: string;
  work_email: string;
  company: string;
  role: string | null;
  team_size: string | null;
  needs_json: string;
  timeline: string | null;
  message: string;
  status: EnterpriseInquiry['status'];
  created_at: string;
}

export async function listEnterpriseInquiries(limit = 50): Promise<EnterpriseInquiry[]> {
  const result = await env.DB.prepare(
    `SELECT id, contact_name, work_email, company, role, team_size, needs_json, timeline, message, status, created_at
     FROM enterprise_inquiries ORDER BY created_at DESC LIMIT ?`,
  ).bind(limit).all<EnterpriseInquiryRow>();
  return result.results.map((row) => ({
    id: row.id,
    contactName: row.contact_name,
    workEmail: row.work_email,
    company: row.company,
    role: row.role,
    teamSize: row.team_size,
    needs: JSON.parse(row.needs_json) as string[],
    timeline: row.timeline,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
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

export async function admitLoginAttempt(identity: string, now = new Date()): Promise<number | null> {
  const identityHash = await sha256(identity);
  const windowMs = 15 * 60 * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs).toISOString();
  const row = await env.DB.prepare(
    `INSERT INTO login_attempts (identity_hash, window_start, attempts) VALUES (?, ?, 1)
     ON CONFLICT(identity_hash, window_start) DO UPDATE SET attempts = attempts + 1
     WHERE attempts < 10 RETURNING attempts`,
  ).bind(identityHash, windowStart).first<{ attempts: number }>();
  return row?.attempts ?? null;
}
