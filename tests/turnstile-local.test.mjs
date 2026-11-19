import assert from 'node:assert/strict';
import { test } from 'node:test';
import { turnstileSiteKey, verifyTurnstile } from '../lib/api/turnstile.ts';

void test('official dummy credentials are limited to loopback development', async () => {
  const loopback = new Request('http://localhost:8803/signin');
  const deployed = new Request('https://redwood.example/signin');
  const dummySite = '1x00000000000000000000AA';
  const dummySecret = '1x0000000000000000000000000000000AA';
  const saved = { ...process.env };
  const realFetch = globalThis.fetch;
  try {
    Object.assign(process.env, {
      REDWOOD_LOCAL_PREVIEW: '1',
      TURNSTILE_SITE_KEY: dummySite,
      TURNSTILE_SECRET_KEY: dummySecret,
      TURNSTILE_EXPECTED_HOSTNAME: 'example.com',
    });
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json({ success: true, hostname: 'example.com' });
    };
    assert.equal(turnstileSiteKey(loopback), dummySite);
    assert.equal(await verifyTurnstile(loopback, 'XXXX.DUMMY.TOKEN.XXXX', 'unknown'), true);
    assert.equal(turnstileSiteKey(deployed), null);
    assert.equal(await verifyTurnstile(deployed, 'XXXX.DUMMY.TOKEN.XXXX', 'unknown'), false);
    delete process.env.REDWOOD_LOCAL_PREVIEW;
    assert.equal(turnstileSiteKey(loopback), null);
    assert.equal(await verifyTurnstile(loopback, 'XXXX.DUMMY.TOKEN.XXXX', 'unknown'), false);
    assert.equal(calls, 1);
    process.env.TURNSTILE_SITE_KEY = 'real-site-key-fixture';
    assert.equal(turnstileSiteKey(deployed), null);
    process.env.TURNSTILE_SECRET_KEY = 'real-server-key-fixture';
    assert.equal(await verifyTurnstile(deployed, 'real-token-fixture', 'unknown'), false);
    globalThis.fetch = async () => Response.json({ success: true, hostname: 'example.com', action: 'login' });
    assert.equal(await verifyTurnstile(deployed, 'real-token-fixture', 'unknown'), true);
    process.env.TURNSTILE_EXPECTED_HOSTNAME = 'redwood.example';
    assert.equal(await verifyTurnstile(deployed, 'real-token-fixture', 'unknown'), false);
  } finally {
    globalThis.fetch = realFetch;
    for (const key of ['REDWOOD_LOCAL_PREVIEW', 'TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'TURNSTILE_EXPECTED_HOSTNAME']) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
