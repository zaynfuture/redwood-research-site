import { error, json } from '@/lib/api/http';
import { turnstileSiteKey } from '@/lib/api/turnstile';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const siteKey = turnstileSiteKey(request);
  if (!siteKey) {
    return error(
      'captcha_unavailable',
      'Human verification is temporarily unavailable.',
      503,
    );
  }
  return json({ provider: 'turnstile', site_key: siteKey, action: 'login' });
}
