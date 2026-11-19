import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hashPassword, normalizeEmail, PASSWORD_ITERATIONS, randomHex, validatePassword } from '../lib/api/security.ts';
import { d1Query, root, sqlString, terminalPassword } from './account-operator.mjs';

export async function bootstrapAccount({ query, email, prompt }) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error('Supply the email of the first administrator.');
  const [existing] = query('SELECT EXISTS (SELECT 1 FROM users) AS occupied');
  if (existing?.results[0]?.occupied !== 0) {
    throw new Error('The selected database already has a user or its state could not be confirmed.');
  }

  const password = prompt();
  if (!validatePassword(password)) throw new Error('Use a password of 12–128 characters.');
  const id = randomUUID();
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt, PASSWORD_ITERATIONS);
  const values = [id, normalized, hash, salt, new Date().toISOString()].map(sqlString);
  const [created] = query(`INSERT INTO users
    (id, email, password_hash, password_salt, password_iterations, enabled, daily_limit, created_at, plan, subscription_status)
    SELECT ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${PASSWORD_ITERATIONS}, 1, 100, ${values[4]}, 'free', 'inactive'
    WHERE NOT EXISTS (SELECT 1 FROM users)
    RETURNING id`);
  if (created?.results[0]?.id !== id) {
    throw new Error('First account was not confirmed. Check the selected database before retrying.');
  }
  return id;
}

export function localAdminConfig(path) {
  let content = '';
  try { content = readFileSync(path, 'utf8'); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const entries = [...content.matchAll(/^\s*(?:export\s+)?REDWOOD_ADMIN_USER_IDS\s*=([^\r\n]*)/gm)];
  if (entries.length > 1 || entries.some(([, value]) => !/^\s*(?:""|'')?\s*(?:#.*)?$/.test(value))) {
    throw new Error('A local administrator setting already exists. Review .dev.vars before bootstrapping.');
  }
  return content;
}

function writeLocalAdmin(path, id) {
  const content = localAdminConfig(path);
  const setting = 'REDWOOD_ADMIN_USER_IDS=' + id;
  const previous = /^[ \t]*(?:export[ \t]+)?REDWOOD_ADMIN_USER_IDS[ \t]*=[^\r\n]*/m;
  const next = previous.test(content) ? content.replace(previous, setting)
    : content + (content && !content.endsWith('\n') ? '\n' : '') + setting + '\n';
  const temporary = path + '.bootstrap-' + randomUUID();
  try {
    writeFileSync(temporary, next, { mode: 0o600, flag: 'wx' });
    if (localAdminConfig(path) !== content) throw new Error('Local settings changed during initialization.');
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

async function main() {
  const [mode, email, ...rest] = process.argv.slice(2);
  if (!['--local', '--remote'].includes(mode) || !email || rest.length) {
    throw new Error('Usage: npm run account:bootstrap-admin -- --local|--remote EMAIL');
  }
  const local = mode === '--local';
  const config = join(root, '.dev.vars');
  if (local) localAdminConfig(config);
  console.error('Target: ' + (local ? 'local D1' : 'Cloudflare D1') + ' / redwood-api-gateway');
  const query = d1Query(mode);
  // Confirm that the matching release schema is available before collecting a password.
  query('SELECT sequence FROM feature_access_events LIMIT 0');
  const id = await bootstrapAccount({ query, email, prompt: terminalPassword });
  console.log('Created account ID: ' + id);
  if (local) {
    try {
      writeLocalAdmin(config, id);
    } catch {
      throw new Error('Account created. Save the printed ID as REDWOOD_ADMIN_USER_IDS in .dev.vars to finish.');
    }
    console.log('Local administrator configured. Restart the local Worker to apply it.');
  } else {
    console.log('Set REDWOOD_ADMIN_USER_IDS to this ID in the target Worker configuration to enable the role.');
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
