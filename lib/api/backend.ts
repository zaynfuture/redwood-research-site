import { isLocalPreview } from './local-preview.mjs';

type RedwoodRequest = {
  request: Request;
  path: string;
  body: Record<string, unknown>;
  requestId: string;
  timeoutMs: number;
  maxResponseBytes: number;
  locale?: string;
  portfolio?: boolean;
};

async function requestRedwood(input: RedwoodRequest): Promise<unknown> {
  const upstream = process.env.REDWOOD_API_UPSTREAM;
  const serviceToken = input.portfolio
    ? process.env.REDWOOD_PORTFOLIO_SERVICE_TOKEN
    : process.env.REDWOOD_API_SERVICE_TOKEN;
  if (!upstream || !serviceToken) throw new Error('upstream_not_configured');

  const configured = new URL(upstream);
  const localDevelopment = isLocalPreview(input.request) &&
    configured.protocol === 'http:' && configured.hostname === '127.0.0.1';
  if (configured.username || configured.password || (configured.protocol !== 'https:' && !localDevelopment)) {
    throw new Error('invalid_upstream_configuration');
  }
  const url = new URL(input.path, configured.origin);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${serviceToken}`,
      'content-type': 'application/json',
      'user-agent': 'Redwood-Research-Site/1.0',
      'x-request-id': input.requestId,
      ...(input.locale && { 'accept-language': input.locale }),
    },
    body: JSON.stringify(input.body),
    redirect: 'manual',
    signal: AbortSignal.timeout(input.timeoutMs),
  });
  if (!response.ok && !(input.portfolio && response.status === 422)) throw new Error('upstream_failed');
  const contentType = response.headers.get('content-type') ?? '';
  const declaredLength = Number(response.headers.get('content-length') ?? '0');
  if (!contentType.includes('application/json') || declaredLength > input.maxResponseBytes) {
    throw new Error('invalid_upstream_response');
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > input.maxResponseBytes) {
    throw new Error('upstream_response_too_large');
  }
  try {
    const data = JSON.parse(text);
    return input.portfolio ? { status: response.status, data } : data;
  } catch {
    throw new Error('invalid_upstream_response');
  }
}

export function runPrivateTool(request: Request, input: string, requestId: string): Promise<unknown> {
  return requestRedwood({
    request, path: '/v1/query', body: { input }, requestId, timeoutMs: 60_000, maxResponseBytes: 512_000,
  });
}

export function runPrivateVolumeProfile(request: Request, symbol: string, window: 'regular-session' | 'closing-half-hour', requestId: string): Promise<unknown> {
  return requestRedwood({
    request, path: '/v1/volume-profile', body: { symbol, window }, requestId, timeoutMs: 125_000, maxResponseBytes: 8_000_000,
  });
}

export function runPrivateMarketSentiment(request: Request, locale: string, requestId: string): Promise<unknown> {
  return requestRedwood({
    request, path: '/v1/market-sentiment', body: { locale }, requestId, locale, timeoutMs: 45_000, maxResponseBytes: 64_000,
  });
}

export function runPrivatePortfolio(request: Request, credentials: { token: string; query_id: string }, requestId: string) {
  return requestRedwood({
    request, path: '/v1/portfolio/analysis', body: credentials, requestId, portfolio: true,
    timeoutMs: 40_000, maxResponseBytes: 256_000,
  }) as Promise<{ status: number; data: { code?: string; as_of?: string; positions?: unknown[] } }>;
}
