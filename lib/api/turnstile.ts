import { isLocalPreview } from './local-preview.mjs';

interface TurnstileResult {
  success?: boolean;
  action?: string;
  hostname?: string;
}

const testSiteKey = '1x00000000000000000000AA';
const testSecret = '1x0000000000000000000000000000000AA';
const testHostname = 'example.com';

function turnstileConfig(request: Request) {
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const hostname = process.env.TURNSTILE_EXPECTED_HOSTNAME;
  if (!siteKey || !secret || !hostname) return null;

  const dummyKey = /^[123]x0{20}(AA|AB|BB|FF)$/.test(siteKey) || /^[123]x0{31}AA$/.test(secret);
  if (dummyKey) {
    if (!isLocalPreview(request) ||
        siteKey !== testSiteKey || secret !== testSecret || hostname !== testHostname) return null;
  }
  return { siteKey, secret, hostname, dummyKey };
}

export function turnstileSiteKey(request: Request): string | null {
  return turnstileConfig(request)?.siteKey ?? null;
}

export async function verifyTurnstile(request: Request, token: unknown, remoteIp: string): Promise<boolean> {
  const config = turnstileConfig(request);
  if (!config || typeof token !== 'string' || token.length < 1 || token.length > 2_048) return false;

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret: config.secret,
        response: token,
        ...(remoteIp !== 'unknown' && { remoteip: remoteIp }),
        idempotency_key: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;
    const result = await response.json<TurnstileResult>();
    // Cloudflare's dummy validation returns a fixed hostname and omits the widget action.
    return result.success === true && result.hostname === config.hostname &&
      (config.dummyKey ? result.action === undefined : result.action === 'login');
  } catch {
    return false;
  }
}
