import { authenticate, authenticateAccountSession } from './store';
import { bearerToken, cookieValue } from './security';

export function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers(extraHeaders);
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  return Response.json(data, {
    status,
    headers,
  });
}

export function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message }, request_id: crypto.randomUUID() }, status);
}

export async function requireUser(request: Request) {
  const token = bearerToken(request);
  return token ? authenticate(token) : null;
}

export async function requireAccountUser(request: Request) {
  const token = cookieValue(request, 'redwood_session');
  return token ? authenticateAccountSession(token) : null;
}

export async function boundedJson(request: Request, maxBytes = 16_384): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > maxBytes) return null;
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}
