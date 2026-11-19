import { requireFeature } from '@/lib/auth/features';
import { runPrivateVolumeProfile } from '@/lib/api/backend';
import { error } from '@/lib/api/http';

export const dynamic = 'force-dynamic';

const TICKER = /^[A-Z][A-Z0-9.-]{0,14}$/;

export async function GET(request: Request): Promise<Response> {
  const admission = await requireFeature(request, 'volume_profile');
  if (admission instanceof Response) return admission;
  const params = new URL(request.url).searchParams;
  const symbol = params.get('symbol') ?? '';
  const window = params.get('window') ?? 'regular-session';
  if (!TICKER.test(symbol)) return error('invalid_symbol', 'Enter an exact uppercase U.S. ticker.', 400);
  if (window !== 'regular-session' && window !== 'closing-half-hour') return error('invalid_window', 'Choose a supported trading window.', 400);
  const requestId = crypto.randomUUID();
  try {
    const profile = await runPrivateVolumeProfile(request, symbol, window, requestId);
    const stillAllowed = await requireFeature(request, 'volume_profile');
    if (stillAllowed instanceof Response) return stillAllowed;
    return Response.json(
      { profile, request_id: requestId },
      { headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } },
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
