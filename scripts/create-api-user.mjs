import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.REDWOOD_NEW_USER_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || password.length > 128) {
  console.error('Usage: REDWOOD_NEW_USER_PASSWORD=<12-128 chars> node scripts/create-api-user.mjs user@example.com');
  process.exit(1);
}
const salt = randomBytes(16).toString('hex');
const iterations = 100000;
const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');
const quoted = (value) => `'${value.replaceAll("'", "''")}'`;
console.log(`INSERT INTO users (id, email, password_hash, password_salt, password_iterations, created_at) VALUES (${quoted(randomUUID())}, ${quoted(email)}, ${quoted(hash)}, ${quoted(salt)}, ${iterations}, ${quoted(new Date().toISOString())});`);
