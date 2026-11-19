import { runPrivateVolumeProfile } from '@/lib/api/backend';
import { error } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

const TICKER = /^[A-Z][A-Z0-9.-]{0,14}$/;

export async function GET(request: Request): Promise<Response> {
  const symbol = new URL(request.url).searchParams.get('symbol') ?? '';
  if (!TICKER.test(symbol)) return error('invalid_symbol', 'Enter an exact uppercase U.S. ticker.', 400);
  const requestId = crypto.randomUUID();
  try {
    const profile = await runPrivateVolumeProfile(symbol, requestId);
    return Response.json(
      { profile, request_id: requestId },
      { headers: { 'cache-control': 'public, max-age=900', 'x-content-type-options': 'nosniff' } },
    );
  } catch (caught) {
    console.error(JSON.stringify({
      event: 'redwood_volume_profile_upstream_error',
      request_id: requestId,
      error_type: caught instanceof Error ? caught.message : 'unknown',
    }));
    return error(
      'market_data_unavailable',
      'Automatic market-data analysis is temporarily unavailable.',
      503,
    );
  }
}
