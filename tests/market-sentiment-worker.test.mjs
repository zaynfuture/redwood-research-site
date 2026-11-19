import assert from 'node:assert/strict';
import { test } from 'node:test';

const origin = process.env.REDWOOD_PROFILE_PREVIEW_URL;
const locales = {
  en: ['U.S. Market Sentiment', 'Welcome back.'],
  'zh-CN': ['美股市场情绪', '欢迎回来。'],
  'zh-TW': ['美股市場情緒', '歡迎回來。'],
};

for (const [tag, [heading, signIn]] of Object.entries(locales)) {
  void test(`Worker honors the shared ${tag} locale and renders localized pages`, { skip: !origin }, async () => {
    const headers = { Cookie: `redwood-locale=${tag}` };
    for (const [path, title] of [['/market-sentiment', heading], ['/signin', signIn]]) {
      const response = await fetch(new URL(path, origin), { headers });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`<html lang="${tag}"`));
      assert.ok(html.includes(title));
    }
    const profile = await fetch(new URL('/volume-profile', origin), { headers });
    assert.equal(profile.status, 401);
    assert.equal(profile.headers.get('content-language'), tag);
    const response = await fetch(new URL(`/api/market-sentiment?lang=${tag}`, origin));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).error.code, 'unauthorized');
  });
}
