import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
export const sqlString = value => "'" + value.replaceAll("'", "''") + "'";

export function terminalPassword() {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    throw new Error('Run this command in an interactive terminal.');
  }
  const reply = spawnSync('/bin/bash', ['-c', [
    'IFS= read -r -s -p "New password: " password || exit 1',
    'printf "\\n" >&2',
    'IFS= read -r -s -p "Repeat password: " confirmation || exit 1',
    'printf "\\n" >&2',
    '[[ "$password" == "$confirmation" ]] || exit 2',
    'printf "%s" "$password"',
  ].join('\n')], { stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8' });
  if (reply.status === 2) throw new Error('The passwords did not match.');
  if (reply.status !== 0) throw new Error('Password entry was cancelled.');
  return reply.stdout;
}

export function d1Query(mode) {
  return sql => {
    const reply = spawnSync(process.execPath, [
      wrangler, 'd1', 'execute', 'redwood-api-gateway', mode, '--json', '--command', sql,
    ], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      env: { ...process.env, WRANGLER_WRITE_LOGS: 'false', WRANGLER_SEND_METRICS: 'false' },
    });
    let parsed;
    try { parsed = JSON.parse(reply.stdout); } catch { /* Report a redacted error below. */ }
    if (reply.status !== 0 || !Array.isArray(parsed) || parsed.some(result => !result.success)) {
      const code = parsed?.error?.code;
      const suffix = Number.isInteger(code) ? ' (Cloudflare ' + code + ')' : '';
      throw new Error('D1 did not confirm the operation' + suffix + '. Check the configured database and your permissions.');
    }
    return parsed;
  };
}
