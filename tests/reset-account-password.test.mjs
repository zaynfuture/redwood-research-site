import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { hashPassword } from '../lib/api/security.ts';
import { resetAccountPassword } from '../scripts/reset-account-password.mjs';

void test('operator password reset preserves identity and revokes only that account’s sessions', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of ['0000_api_gateway.sql', '0001_membership.sql']) {
      db.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
    }
    const create = db.prepare(`INSERT INTO users (id,email,password_hash,password_salt,password_iterations,created_at,enabled,google_sub)
      VALUES (?, ?, 'old-hash', 'old-salt', 100000, '2026-01-01', ?, ?)`);
    create.run('admin-fixture', "admin'o@example.test", 1, 'google-fixture');
    create.run('other-fixture', 'other@example.test', 1, null);
    create.run('disabled-fixture', 'disabled@example.test', 0, null);

    for (const table of ['account_sessions', 'api_sessions']) {
      const insert = db.prepare(`INSERT INTO ${table} VALUES (?, ?, '2099-01-01', '2026-01-01')`);
      insert.run('admin-session', 'admin-fixture');
      insert.run('other-session', 'other-fixture');
    }

    const statements = [];
    const query = sql => {
      statements.push(sql);
      db.exec('BEGIN');
      try {
        const results = sql.split(';').map(statement => statement.trim()).filter(Boolean).map(statement => {
          const prepared = db.prepare(statement);
          if (statement.startsWith('DELETE')) {
            prepared.run();
            return { results: [] };
          }
          return { results: prepared.all() };
        });
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    };
    const rejectPrompt = () => assert.fail('An unmatched account must be rejected before prompting.');
    for (const [email, id] of [
      ['admin@example.test', 'admin-fixture'],
      ["admin'o@example.test", 'other-fixture'],
      ['disabled@example.test', 'disabled-fixture'],
    ]) {
      await assert.rejects(resetAccountPassword({ query, email, id, prompt: rejectPrompt }), /No enabled account/);
    }
    const admin = { query, email: "ADMIN'O@example.test", id: 'admin-fixture' };
    await assert.rejects(resetAccountPassword({ ...admin, prompt: () => 'too short' }), /12–128/);
    const password = 'example fixture password $ 123';
    await resetAccountPassword({ ...admin, prompt: () => password });

    assert.ok(!statements.some(sql => sql.includes(password)));
    const changed = db.prepare('SELECT * FROM users WHERE id = ?').get('admin-fixture');
    assert.equal(changed.google_sub, 'google-fixture');
    assert.equal(changed.id, 'admin-fixture');
    assert.match(changed.password_salt, /^[a-f0-9]{32}$/);
    assert.equal(changed.password_hash, await hashPassword(password, changed.password_salt, changed.password_iterations));
    assert.equal(db.prepare('SELECT password_hash FROM users WHERE id = ?').get('other-fixture').password_hash, 'old-hash');
    for (const table of ['account_sessions', 'api_sessions']) {
      assert.deepEqual(db.prepare(`SELECT user_id FROM ${table}`).all().map(row => row.user_id), ['other-fixture']);
    }
  } finally {
    db.close();
  }
});
