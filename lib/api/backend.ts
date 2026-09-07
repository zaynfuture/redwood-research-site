const FORBIDDEN_KEYS = new Set([
  'chain_of_thought',
  'reasoning',
  'analysis',
  'system_prompt',
  'developer_prompt',
  'tool_calls',
  'internal',
]);

function publicResult(value: unknown, depth = 0): unknown {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => publicResult(item, depth + 1));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !FORBIDDEN_KEYS.has(key.toLowerCase()))
        .map(([key, item]) => [key, publicResult(item, depth + 1)]),
    );
  }
  return value;
}

export async function runPrivateTool(input: string, requestId: string): Promise<unknown> {
  const upstream = process.env.REDWOOD_API_UPSTREAM;
  const serviceToken = process.env.REDWOOD_API_SERVICE_TOKEN;
  if (!upstream || !serviceToken) throw new Error('upstream_not_configured');

  const url = new URL(upstream);
  if (url.protocol !== 'https:') throw new Error('invalid_upstream_configuration');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${serviceToken}`,
      'content-type': 'application/json',
      'x-request-id': requestId,
    },
    body: JSON.stringify({ input }),
    redirect: 'error',
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error('upstream_failed');
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new Error('invalid_upstream_response');

  const result: unknown = await response.json();
  return publicResult(result);
}
