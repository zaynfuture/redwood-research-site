import { pathToFileURL } from 'node:url';
import { hashPassword, normalizeEmail, PASSWORD_ITERATIONS, randomHex, validatePassword } from '../lib/api/security.ts';

import { d1Query, sqlString, terminalPassword } from './account-operator.mjs';

export async function resetAccountPassword({ query, email, id, prompt }) {
  const normalized = normalizeEmail(email);
  if (!normalized || typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    throw new Error('Supply a valid email and its existing account ID.');
  }
  const account = 'id = ' + sqlString(id) + ' AND email = ' + sqlString(normalized) + ' AND enabled = 1';
  const [match] = query('SELECT id FROM users WHERE ' + account);
  if (match?.results.length !== 1 || match.results[0].id !== id) {
    throw new Error('No enabled account matches both identifiers in the selected database.');
  }

  const password = prompt();
  if (!validatePassword(password)) throw new Error('Use a password of 12–128 characters.');
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt, PASSWORD_ITERATIONS);
  const rotated = 'SELECT 1 FROM users WHERE ' + account + ' AND password_salt = ' + sqlString(salt);
  const results = query(
    'UPDATE users SET password_hash = ' + sqlString(hash) + ', password_salt = ' + sqlString(salt)
      + ', password_iterations = ' + PASSWORD_ITERATIONS + ' WHERE ' + account + ' RETURNING id;\n'
      + 'DELETE FROM account_sessions WHERE user_id = ' + sqlString(id) + ' AND EXISTS (' + rotated + ');\n'
      + 'DELETE FROM api_sessions WHERE user_id = ' + sqlString(id) + ' AND EXISTS (' + rotated + ');',
  );
  if (results.length !== 3 || results[0]?.results[0]?.id !== id) {
    throw new Error('Password change could not be confirmed. Check the account in the selected database before retrying.');
  }
}

async function main() {
  const [mode, email, id, ...rest] = process.argv.slice(2);
  if (!['--local', '--remote'].includes(mode) || !email || !id || rest.length) {
    throw new Error('Usage: npm run account:password -- --local|--remote EMAIL USER_ID');
  }
  const query = d1Query(mode);
  console.error('Target: ' + (mode === '--remote' ? 'Cloudflare D1' : 'local D1') + ' / redwood-api-gateway');
  await resetAccountPassword({ query, email, id, prompt: terminalPassword });
  console.log('Password updated. Existing website and API sessions revoked.');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
