import { runPrivateMarketSentiment } from '@/lib/api/backend';
import { resolveLocale } from '@/lib/locale';

export const dynamic = 'force-dynamic';

const unavailable = {
  en: 'Market sentiment is temporarily unavailable.',
  'zh-CN': '市场情绪分析暂时无法获取。',
  'zh-TW': '市場情緒分析暫時無法取得。',
};

export async function GET(request: Request): Promise<Response> {
  const locale = resolveLocale(new URL(request.url).searchParams.get('lang'));
  const headers = { 'cache-control': 'no-store', 'content-language': locale, 'x-content-type-options': 'nosniff' };
  try {
    const result = await runPrivateMarketSentiment(locale, crypto.randomUUID());
    return Response.json(result, { headers });
  } catch {
    return Response.json(
      { code: 'market_sentiment_unavailable', message: unavailable[locale] },
      { headers, status: 503 },
    );
  }
}
