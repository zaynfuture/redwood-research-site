import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { hashPassword } from '../lib/api/security.ts';
import { bootstrapAccount, localAdminConfig } from '../scripts/bootstrap-admin.mjs';

void test('bootstrap creates only the first user and generates a fixed account identity', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const migration of ['0000_api_gateway.sql', '0001_membership.sql']) {
      db.exec(readFileSync(new URL('../drizzle/' + migration, import.meta.url), 'utf8'));
    }
    const password = 'Fixture bootstrap password only';
    const query = sql => {
      assert.ok(!sql.includes(password));
      return [{ results: db.prepare(sql).all() }];
    };
    const email = 'owner@example.test';
    const race = () => {
      db.exec(`INSERT INTO users (id,email,password_hash,password_salt,password_iterations,created_at)
        VALUES ('registered-first','different@example.test','old','salt',100000,'2026-01-01')`);
      return password;
    };
    await assert.rejects(bootstrapAccount({ query, email, prompt: race }), /First account was not confirmed/);
    assert.equal(db.prepare('SELECT count(*) AS total FROM users').get().total, 1);
    await assert.rejects(bootstrapAccount({ query, email, prompt: () => assert.fail('Unexpected prompt') }), /already has a user/);
    db.exec('DELETE FROM users');
    const id = await bootstrapAccount({ query, email: email.toUpperCase(), prompt: () => password });
    const user = db.prepare('SELECT * FROM users').get();
    assert.match(id, /^[a-f0-9-]{36}$/);
    assert.equal(user.id, id);
    assert.equal(user.email, email);
    assert.equal(user.google_sub, null);
    assert.equal(user.plan, 'free');
    assert.equal(user.password_hash, await hashPassword(password, user.password_salt, user.password_iterations));
  } finally {
    db.close();
  }
});

void test('local bootstrap refuses to replace a configured administrator', () => {
  const folder = mkdtempSync(join(tmpdir(), 'redwood-admin-config-test-'));
  const file = join(folder, '.dev.vars');
  try {
    assert.equal(localAdminConfig(file), '');
    writeFileSync(file, 'OTHER_VAR=sample\nREDWOOD_ADMIN_USER_IDS= # intentionally blank\n');
    assert.match(localAdminConfig(file), /OTHER_VAR=sample/);
    writeFileSync(file, 'export REDWOOD_ADMIN_USER_IDS="actual-existing-id"\n');
    assert.throws(() => localAdminConfig(file), /setting already exists/);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
