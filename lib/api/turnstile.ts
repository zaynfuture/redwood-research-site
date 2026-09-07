interface TurnstileResult {
  success?: boolean;
  action?: string;
  hostname?: string;
}

export function turnstileSiteKey(): string | null {
  return process.env.TURNSTILE_SITE_KEY || null;
}

export async function verifyTurnstile(token: unknown, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME;
  if (!secret || !expectedHostname || typeof token !== 'string' || token.length < 1 || token.length > 2_048) {
    return false;
  }
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp,
        idempotency_key: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;
    const result = await response.json<TurnstileResult>();
    return result.success === true && result.action === 'login' && result.hostname === expectedHostname;
  } catch {
    return false;
  }
}
