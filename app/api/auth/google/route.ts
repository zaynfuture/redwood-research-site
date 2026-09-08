import { randomHex } from '@/lib/api/security';
import { storeOAuthState } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return new Response('Google sign-in is not configured.', { status: 503 });
  const state = randomHex();
  const nonce = randomHex();
  await storeOAuthState(state, nonce, new Date(Date.now() + 10 * 60 * 1000).toISOString());
  const origin = new URL(request.url).origin;
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account',
  }).toString();
  return new Response(null, { status: 302, headers: {
    location: url.toString(),
    'set-cookie': `redwood_oauth_state=${state}; Path=/api/auth/google; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  } });
}
