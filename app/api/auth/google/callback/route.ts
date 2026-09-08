import { consumeOAuthState, createAccountSession, findOrCreateGoogleAccount } from '@/lib/api/store';
import { cookieValue, randomHex, sessionCookie } from '@/lib/api/security';
import { ACCOUNT_SESSION_SECONDS } from '@/lib/auth/account';
import { verifyGoogleIdToken } from '@/lib/auth/google';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const stateCookie = cookieValue(request, 'redwood_oauth_state');
  if (!state || !code || !stateCookie || state !== stateCookie) return Response.redirect(`${url.origin}/signin?error=oauth`, 302);
  const nonce = await consumeOAuthState(state);
  if (!nonce || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return Response.redirect(`${url.origin}/signin?error=oauth`, 302);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenResponse.json<{ id_token?: string }>();
  const claims = tokens.id_token ? await verifyGoogleIdToken(tokens.id_token, nonce) : null;
  if (!claims) return Response.redirect(`${url.origin}/signin?error=oauth`, 302);
  const user = await findOrCreateGoogleAccount({ email: claims.email.toLowerCase(), sub: claims.sub, displayName: claims.name ?? null });
  const token = randomHex();
  await createAccountSession(user.id, token, new Date(Date.now() + ACCOUNT_SESSION_SECONDS * 1000).toISOString());
  const headers = new Headers({ location: `${url.origin}/dashboard` });
  headers.append('set-cookie', sessionCookie(token, ACCOUNT_SESSION_SECONDS));
  headers.append('set-cookie', 'redwood_oauth_state=; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return new Response(null, { status: 302, headers });
}
