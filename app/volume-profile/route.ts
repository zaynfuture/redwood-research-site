import { requireFeature } from '@/lib/auth/features';
import { cookies } from 'next/headers';
import { localeCookie, resolveLocale } from '@/lib/locale';
import { renderVolumeProfile } from '@/lib/volume-profile-document';

export async function GET(request: Request): Promise<Response> {
  const explicit = new URL(request.url).searchParams.get('lang');
  const locale = resolveLocale(explicit ?? (await cookies()).get(localeCookie)?.value);
  const access = await requireFeature(request, 'volume_profile');
  if (access instanceof Response) {
    const signedOut = access.status === 401;
    const { error } = await access.json() as { error: { code: string } };
    const expired = error.code === 'access_expired';
    const messages = {
      en: ['Sign in to open Volume Profile.', 'Ask an administrator to enable Volume Profile.', 'Your Volume Profile access has expired.', 'Sign in', 'Account'],
      'zh-CN': ['请登录后使用成交量分布。', '请联系管理员开通成交量分布。', '你的成交量分布权限已过期。', '登录', '账户'],
      'zh-TW': ['請登入後使用成交量分布。', '請聯絡管理員開通成交量分布。', '你的成交量分布權限已到期。', '登入', '帳戶'],
    }[locale];
    return new Response(`<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Volume Profile | Redwood Research</title><main style="max-width:44rem;margin:4rem auto;padding:1.25rem;font:1rem system-ui"><h1>Volume Profile</h1><p>${messages[signedOut ? 0 : expired ? 2 : 1]}</p><a href="${signedOut ? '/signin' : '/dashboard'}">${messages[signedOut ? 3 : 4]}</a></main></html>`, {
      status: access.status,
      headers: { 'content-type': 'text/html; charset=utf-8', 'content-language': locale, 'cache-control': 'private, no-store' },
    });
  }
  return new Response(renderVolumeProfile(locale), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-language': locale,
      'cache-control': 'private, no-store',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  });
}
