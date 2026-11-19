import { cookies } from 'next/headers';
import { localeCookie, resolveLocale } from '@/lib/locale';
import { renderVolumeProfile } from '@/lib/volume-profile-document';

export async function GET(request: Request): Promise<Response> {
  const explicit = new URL(request.url).searchParams.get('lang');
  const locale = resolveLocale(explicit ?? (await cookies()).get(localeCookie)?.value);
  return new Response(renderVolumeProfile(locale), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-language': locale,
      'cache-control': explicit ? 'public, max-age=300' : 'private, no-store',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  });
}
