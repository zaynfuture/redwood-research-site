interface GoogleClaims {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  nonce?: string;
  exp: number;
}

function base64UrlBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value))) as T;
}

export async function verifyGoogleIdToken(idToken: string, expectedNonce: string): Promise<GoogleClaims | null> {
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;
  const header = decodeJson<{ alg?: string; kid?: string }>(parts[0]);
  if (header.alg !== 'RS256' || !header.kid) return null;

  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!response.ok) return null;
  const { keys } = await response.json<{ keys: Array<JsonWebKey & { kid?: string; kty?: string }> }>();
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) return null;

  const claims = decodeJson<GoogleClaims>(parts[1]);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !['https://accounts.google.com', 'accounts.google.com'].includes(claims.iss) ||
      claims.aud !== clientId || claims.exp <= Math.floor(Date.now() / 1000) ||
      claims.nonce !== expectedNonce || !claims.sub || !claims.email || claims.email_verified !== true) return null;
  return claims;
}
