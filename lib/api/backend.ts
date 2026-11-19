type RedwoodRequest = {
  path: string;
  body: Record<string, unknown>;
  requestId: string;
  timeoutMs: number;
  maxResponseBytes: number;
  locale?: string;
};

async function requestRedwood(input: RedwoodRequest): Promise<unknown> {
  const upstream = process.env.REDWOOD_API_UPSTREAM;
  const serviceToken = process.env.REDWOOD_API_SERVICE_TOKEN;
  if (!upstream || !serviceToken) throw new Error('upstream_not_configured');

  const configured = new URL(upstream);
  if (configured.protocol !== 'https:') throw new Error('invalid_upstream_configuration');
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
  if (!response.ok) throw new Error('upstream_failed');
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
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('invalid_upstream_response');
  }
}

export function runPrivateTool(input: string, requestId: string): Promise<unknown> {
  return requestRedwood({
    path: '/v1/query', body: { input }, requestId, timeoutMs: 60_000, maxResponseBytes: 512_000,
  });
}

export function runPrivateVolumeProfile(symbol: string, requestId: string): Promise<unknown> {
  return requestRedwood({
    path: '/v1/volume-profile', body: { symbol }, requestId, timeoutMs: 125_000, maxResponseBytes: 8_000_000,
  });
}

export function runPrivateMarketSentiment(locale: string, requestId: string): Promise<unknown> {
  return requestRedwood({
    path: '/v1/market-sentiment', body: { locale }, requestId, locale, timeoutMs: 45_000, maxResponseBytes: 64_000,
  });
}
