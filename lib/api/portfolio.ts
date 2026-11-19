import { env } from 'cloudflare:workers';

export type Credentials = { token: string; query_id: string };
export type Connection = {
  revision: string;
  encrypted_credentials: string;
  state: 'saved' | 'connected' | 'invalid';
  updated_at: string;
};

const encoder = new TextEncoder();

async function key() {
  const hex = process.env.REDWOOD_PORTFOLIO_ENCRYPTION_KEY ?? '';
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('encryption_unavailable');
  return crypto.subtle.importKey('raw', Uint8Array.from(hex.match(/../g)!, pair => parseInt(pair, 16)),
    'AES-GCM', false, ['encrypt', 'decrypt']);
}

function cipherOptions(userId: string, revision: string, iv: Uint8Array<ArrayBuffer>) {
  return { name: 'AES-GCM', iv, additionalData: encoder.encode(JSON.stringify([userId, revision])) };
}

export async function getConnection(userId: string) {
  return env.DB.prepare(
    'SELECT revision, encrypted_credentials, state, updated_at FROM portfolio_connections WHERE user_id = ?',
  ).bind(userId).first<Connection>();
}

export async function saveConnection(userId: string, credentials: Credentials) {
  const revision = crypto.randomUUID();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(cipherOptions(userId, revision, iv), await key(),
    encoder.encode(JSON.stringify(credentials)));
  const encrypted = btoa(String.fromCharCode(...iv, ...new Uint8Array(ciphertext)));
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO portfolio_connections
    (user_id, revision, encrypted_credentials, state, updated_at) VALUES (?, ?, ?, 'saved', ?)
    ON CONFLICT(user_id) DO UPDATE SET revision = excluded.revision,
    encrypted_credentials = excluded.encrypted_credentials, state = 'saved', updated_at = excluded.updated_at`)
    .bind(userId, revision, encrypted, updatedAt).run();
  return { state: 'saved', updated_at: updatedAt };
}

export async function removeConnection(userId: string) {
  await env.DB.prepare('DELETE FROM portfolio_connections WHERE user_id = ?').bind(userId).run();
}

export async function decryptConnection(userId: string, connection: Connection): Promise<Credentials> {
  const bytes = Uint8Array.from(atob(connection.encrypted_credentials), char => char.charCodeAt(0));
  const clear = await crypto.subtle.decrypt(cipherOptions(userId, connection.revision, bytes.slice(0, 12)),
    await key(), bytes.slice(12));
  return JSON.parse(new TextDecoder().decode(clear)) as Credentials;
}

export async function claimRun(userId: string, revision: string, id: string) {
  const now = new Date();
  const staleBefore = new Date(+now - 120_000).toISOString();
  const [, claimed] = await env.DB.batch([
    env.DB.prepare(`DELETE FROM portfolio_runs
      WHERE user_id = ? AND finished_at IS NULL AND started_at <= ?`).bind(userId, staleBefore),
    env.DB.prepare(`INSERT OR IGNORE INTO portfolio_runs (user_id, id, connection_revision, started_at)
      SELECT user_id, ?, revision, ? FROM portfolio_connections
      WHERE user_id = ? AND revision = ? AND state <> 'invalid'`).bind(id, now.toISOString(), userId, revision),
  ]);
  return claimed.meta.changes === 1;
}

export async function abandonRun(userId: string, id: string) {
  await env.DB.prepare('DELETE FROM portfolio_runs WHERE user_id = ? AND id = ? AND finished_at IS NULL')
    .bind(userId, id).run();
}

export async function invalidateConnection(userId: string, revision: string) {
  await env.DB.prepare(`UPDATE portfolio_connections SET state = 'invalid', updated_at = ?
    WHERE user_id = ? AND revision = ?`).bind(new Date().toISOString(), userId, revision).run();
}

export async function finishRun(userId: string, revision: string, id: string, result: unknown) {
  const now = new Date().toISOString();
  const [saved] = await env.DB.batch([
    env.DB.prepare(`UPDATE portfolio_runs SET result_json = ?, finished_at = ?
      WHERE user_id = ? AND id = ? AND connection_revision = ? AND finished_at IS NULL
      AND EXISTS (SELECT 1 FROM portfolio_connections WHERE user_id = ? AND revision = ?)`)
      .bind(JSON.stringify(result), now, userId, id, revision, userId, revision),
    env.DB.prepare(`UPDATE portfolio_connections SET state = 'connected', updated_at = ?
      WHERE user_id = ? AND revision = ? AND EXISTS (
        SELECT 1 FROM portfolio_runs WHERE user_id = ? AND id = ? AND finished_at = ?
      )`).bind(now, userId, revision, userId, id, now),
    env.DB.prepare(`DELETE FROM portfolio_runs WHERE user_id = ? AND id IN (
      SELECT id FROM portfolio_runs WHERE user_id = ? AND finished_at IS NOT NULL
      ORDER BY started_at DESC, id DESC LIMIT -1 OFFSET 20
    )`).bind(userId, userId),
  ]);
  return saved.meta.changes === 1;
}

export async function runHistory(userId: string, id: string | null) {
  if (id !== null) {
    const run = await env.DB.prepare(`SELECT id, started_at, finished_at, result_json FROM portfolio_runs
      WHERE user_id = ? AND id = ? AND finished_at IS NOT NULL`)
      .bind(userId, id).first<{ id: string; started_at: string; finished_at: string; result_json: string }>();
    if (!run) return null;
    const { result_json, ...summary } = run;
    return { ...summary, result: JSON.parse(result_json) };
  }
  const { results } = await env.DB.prepare(`SELECT id, started_at, finished_at FROM portfolio_runs
    WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY started_at DESC, id DESC LIMIT 20`).bind(userId).all();
  return results;
}
