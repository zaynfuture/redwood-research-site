import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { Miniflare, Response } from 'miniflare';

const script = 'dist/server/index.js';
const origin = 'https://redwood.test';
const portfolio = '/api/portfolio/analysis';
const connection = '/api/portfolio/connection';
const grants = '/api/admin/feature-access';

void test('built Worker enforces independent entitlements and account ownership', { skip: !existsSync(script), timeout: 15_000 }, async () => {
  const upstream = new Map();
  const queue = (path, handler) => upstream.set(path, [...(upstream.get(path) ?? []), handler]);
  queue('/turnstile/v0/siteverify', () => Response.json({ success: true, action: 'login', hostname: 'redwood.test' }));
  const observed = [];
  const worker = new Miniflare({
    modulesRoot: 'dist/server',
    modules: [script, ...readdirSync('dist/server', { recursive: true }).filter(path =>
      path.endsWith('.js') && path !== 'index.js').map(path => 'dist/server/' + path)]
      .map(path => ({ path, type: 'ESModule' })),
    compatibilityDate: '2026-05-22',
    compatibilityFlags: ['nodejs_compat', 'nodejs_compat_populate_process_env'],
    d1Databases: ['DB'],
    outboundService: async request => {
      const { hostname, pathname } = new URL(request.url);
      assert.ok(['challenges.cloudflare.com', 'research.test', 'oauth2.googleapis.com', 'www.googleapis.com'].includes(hostname));
      assert.equal(request.method, pathname === '/oauth2/v3/certs' ? 'GET' : 'POST');
      const handler = upstream.get(pathname)?.shift();
      assert.ok(handler, 'unexpected outbound request: ' + pathname);
      return handler(request);
    },
    bindings: {
      REDWOOD_ADMIN_USER_IDS: 'admin-test',
      REDWOOD_PORTFOLIO_ENCRYPTION_KEY: 'ab'.repeat(32),
      REDWOOD_PORTFOLIO_SERVICE_TOKEN: 'portfolio-test-secret',
      REDWOOD_API_UPSTREAM: 'https://research.test/query',
      REDWOOD_API_SERVICE_TOKEN: 'market-test-secret',
      GOOGLE_CLIENT_ID: 'test-google-client',
      GOOGLE_CLIENT_SECRET: 'test-google-secret',
      TURNSTILE_SITE_KEY: 'public-test-key',
      TURNSTILE_SECRET_KEY: 'private-test-key',
      TURNSTILE_EXPECTED_HOSTNAME: 'redwood.test',
    },
  });

  try {
    const db = await worker.getD1Database('DB');
    for (const file of readdirSync('drizzle').filter(file => file.endsWith('.sql')).sort()) {
      const source = readFileSync('drizzle/' + file, 'utf8');
      const statements = source.split(';').map(part => part.trim()).filter(Boolean);
      await db.batch(statements.map(statement => db.prepare(statement)));
    }

    function call(path, { cookie, method = 'GET', body, requestOrigin = origin } = {}) {
      return worker.dispatchFetch(origin + path, {
        method, redirect: 'manual',
        headers: {
          ...(cookie && { cookie }),
          ...(method !== 'GET' && { origin: requestOrigin }),
          ...(body && { 'content-type': 'application/json' }),
        },
        ...(body && { body: JSON.stringify(body) }),
      });
    }

    async function check(path, status, options) {
      const response = await call(path, options);
      assert.equal(response.status, status, path + ': ' + (response.status === status ? '' : await response.text()));
      return response;
    }

    const password = 'test-password-long-enough';
    async function signup(email) {
      const response = await check('/api/auth/register', 200, { method: 'POST', body: { email, password } });
      return response.headers.get('set-cookie').split(';')[0];
    }
    const adminEmail = 'admin@example.test';
    await db.prepare(`INSERT INTO users (id, email, password_hash, password_salt, password_iterations, created_at)
      VALUES (?, ?, 'unused', 'unused', 100000, ?)`).bind('admin-test', adminEmail, new Date().toISOString()).run();
    await db.prepare("UPDATE users SET plan = 'free', subscription_status = 'inactive' WHERE id = 'admin-test'").run();
    const adminToken = 'test-admin-session';
    const adminHash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(adminToken))).toString('hex');
    await db.prepare('INSERT INTO account_sessions VALUES (?, ?, ?, ?)')
      .bind(adminHash, 'admin-test', '2099-01-01T00:00:00.000Z', new Date().toISOString()).run();
    const admin = 'redwood_session=' + adminToken;

    const signin = await check('/signin', 200);
    assert.match(await signin.text(), /href="\/signup"/);
    await check('/signup', 200);
    const googleKey = await crypto.subtle.generateKey({
      name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256', modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
    }, true, ['sign', 'verify']);
    const publicKey = await crypto.subtle.exportKey('jwk', googleKey.publicKey);
    async function googleSignIn(email, sub) {
      const entry = await check('/api/auth/google', 302);
      const params = new URL(entry.headers.get('location')).searchParams;
      const state = params.get('state');
      const claims = {
        iss: 'https://accounts.google.com', aud: 'test-google-client', sub, email,
        email_verified: true, nonce: params.get('nonce'), exp: Math.floor(Date.now() / 1000) + 600,
      };
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const unsigned = encode({ alg: 'RS256', kid: 'fixture' }) + '.' + encode(claims);
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', googleKey.privateKey, new TextEncoder().encode(unsigned));
      const idToken = unsigned + '.' + Buffer.from(signature).toString('base64url');
      queue('/token', () => Response.json({ id_token: idToken }));
      queue('/oauth2/v3/certs', () => Response.json({ keys: [{ ...publicKey, kid: 'fixture' }] }));
      return check('/api/auth/google/callback?code=test&state=' + state, 302,
        { cookie: entry.headers.get('set-cookie').split(';')[0] });
    }
    const unlinkedAdmin = await googleSignIn(adminEmail, 'unlinked-google-sub');
    assert.match(unlinkedAdmin.headers.get('location'), /signin\?error=oauth$/);
    assert.doesNotMatch(unlinkedAdmin.headers.get('set-cookie') ?? '', /redwood_session=/);
    assert.equal((await db.prepare('SELECT google_sub FROM users WHERE id=?').bind('admin-test').first()).google_sub, null);
    const googleSignup = await googleSignIn('separate-google@example.test', 'new-google-sub');
    assert.match(googleSignup.headers.get('location'), /dashboard$/);
    const googleCookie = googleSignup.headers.get('set-cookie').split(';')[0];
    const googleAccess = await (await check('/api/feature-access', 200, { cookie: googleCookie })).json();
    assert.equal(googleAccess.admin, false);
    assert.ok(Object.values(googleAccess.features).every(feature => !feature.allowed));

    const aliceEmail = 'alice@example.test';
    const signupCookie = await signup(aliceEmail);
    const bob = await signup('bob@example.test');
    await check('/api/auth/logout', 200, { cookie: signupCookie, method: 'POST' });
    await check('/api/feature-access', 401, { cookie: signupCookie });
    const login = await check('/api/auth/login', 200, { method: 'POST',
      body: { email: aliceEmail, password, turnstile_token: 'test-captcha' } });
    const alice = login.headers.get('set-cookie').split(';')[0];

    const volume = '/api/volume-profile?symbol=AAPL';
    const sentiment = '/api/market-sentiment';
    for (const path of [portfolio, connection, volume, sentiment, '/volume-profile', '/api/feature-access']) {
      await check(path, 401);
    }
    for (const path of [portfolio, volume, sentiment, '/volume-profile']) await check(path, 403, { cookie: alice });
    for (const route of ['/portfolio', '/admin/access', '/market-sentiment', '/dashboard']) {
      await check(route, 200, { cookie: alice });
    }
    const adminFeatures = (await (await check('/api/feature-access', 200, { cookie: admin })).json()).features;
    assert.ok(Object.values(adminFeatures).every(feature => feature.allowed));
    const adminAccount = await (await check('/api/account', 200, { cookie: admin })).json();
    assert.equal(adminAccount.can_chat, true);
    assert.equal(adminAccount.user.plan, 'free');
    await check('/api/research/monthly', 200, { cookie: admin });
    await check('/api/research/monthly', 403, { cookie: alice });
    const researchInput = { input: 'Evidence on cash flow and equity valuation' };
    await check('/api/chat', 403, { cookie: alice, method: 'POST', body: researchInput });
    await check('/api/chat', 403, { cookie: admin, method: 'POST', requestOrigin: 'https://foreign.test', body: researchInput });
    queue('/v1/query', () => Response.json({ answer: 'Fixture research evidence' }));
    const chat = await (await check('/api/chat', 200, { cookie: admin, method: 'POST', body: researchInput })).json();
    assert.equal(chat.result.answer, 'Fixture research evidence');
    assert.equal(chat.remaining, 999);


    const aliceId = (await db.prepare('SELECT id FROM users WHERE email = ?').bind(aliceEmail).first()).id;
    const bobId = (await db.prepare('SELECT id FROM users WHERE email = ?').bind('bob@example.test').first()).id;
    const lookup = email => grants + '?email=' + encodeURIComponent(email);
    await check(lookup(aliceEmail), 401);
    await check(lookup(aliceEmail), 403, { cookie: alice });
    const accessTarget = await (await check(lookup(aliceEmail), 200, { cookie: admin })).json();
    assert.equal(accessTarget.id, aliceId);
    assert.equal(accessTarget.google_linked, 0);

    const change = (email, feature, action = 'grant', expiresOn = null, cookie = admin) => check(
      grants, cookie === admin ? 200 : 403, {
        cookie, method: 'POST', body: { email, targetId: email === aliceEmail ? aliceId : bobId, feature, action, expiresOn },
      },
    );
    await change(aliceEmail, 'portfolio', 'grant', null, alice);
    await check(grants, 403, { cookie: admin, method: 'POST', requestOrigin: 'https://foreign.test',
      body: { email: aliceEmail, targetId: aliceId, feature: 'portfolio', action: 'grant' } });
    await check(grants, 409, { cookie: admin, method: 'POST',
      body: { email: aliceEmail, targetId: bobId, feature: 'portfolio', action: 'grant' } });
    await check(grants, 409, { cookie: admin, method: 'POST',
      body: { email: adminEmail, targetId: 'admin-test', feature: 'portfolio', action: 'revoke' } });
    await check(grants, 400, { cookie: admin, method: 'POST',
      body: { email: aliceEmail, targetId: aliceId, feature: 'admin', action: 'grant' } });
    await change(aliceEmail, 'market_sentiment');
    queue('/v1/market-sentiment', () => Response.json({ locale: 'en' }));
    await check(sentiment, 200, { cookie: alice });
    await check(volume, 403, { cookie: alice });
    await check(portfolio, 403, { cookie: alice });
    await change(aliceEmail, 'volume_profile');
    queue('/v1/volume-profile', () => Response.json({ profile: 'test' }));
    const volumeResponse = await check(volume, 200, { cookie: alice });
    assert.match(volumeResponse.headers.get('cache-control'), /no-store/);
    const profilePage = await check('/volume-profile?lang=zh-CN', 200, { cookie: alice });
    assert.match(await profilePage.text(), /<html lang="zh-CN">/);
    await change(aliceEmail, 'portfolio');
    await change('bob@example.test', 'portfolio');
    await check(portfolio, 409, { cookie: alice, method: 'POST' });

    const fixtures = [
      [alice, '98765432112345678901', '10101', 'ALICE'],
      [bob, '98765432112345678902', '20202', 'BOB'],
    ];
    for (const [cookie, token, queryId] of fixtures) {
      const body = { token, queryId };
      await check(connection, 403, { cookie, method: 'PUT', body, requestOrigin: 'https://another.test' });
      const saved = await check(connection, 200, { cookie, method: 'PUT', body });
      assert.doesNotMatch(await saved.text(), new RegExp(token + '|' + queryId));
    }
    for (const [, , , symbol] of fixtures) {
      queue('/v1/portfolio/analysis', async request => {
        observed.push({ credential: await request.json(), authorization: request.headers.get('authorization') });
        return Response.json({ as_of: '2026-01-02', positions: [{ symbol }], priorities: [], gaps: [] });
      });
    }
    const ciphertexts = (await db.prepare('SELECT encrypted_credentials FROM portfolio_connections').all()).results;
    assert.equal(ciphertexts.length, 2);
    for (const row of ciphertexts) {
      for (const [, token, queryId] of fixtures) {
        const decoded = Buffer.from(row.encrypted_credentials, 'base64').toString('utf8');
        assert.ok(!decoded.includes(token) && !decoded.includes(queryId));
      }
    }

    const first = await (await check(portfolio, 200, { cookie: alice, method: 'POST' })).json();
    const second = await (await check(portfolio, 200, { cookie: bob, method: 'POST' })).json();
    assert.equal(first.result.positions[0].symbol, 'ALICE');
    assert.equal(second.result.positions[0].symbol, 'BOB');
    assert.deepEqual(observed, fixtures.map(([, token, queryId]) => ({
      credential: { token, query_id: queryId }, authorization: 'Bearer portfolio-test-secret',
    })));
    assert.deepEqual((await (await check(portfolio, 200, { cookie: alice })).json()).runs.map(run => run.id), [first.id]);
    await check(portfolio + '?id=' + second.id, 404, { cookie: alice });
    await check(portfolio + '?id=' + first.id, 404, { cookie: admin });
    await check(portfolio, 409, { cookie: admin, method: 'POST' });
    const adminConnection = await (await check(connection + '?userId=alice', 200, { cookie: admin })).json();
    assert.equal(adminConnection.connection, null);

    await db.prepare(`INSERT INTO feature_access_events (user_id, feature, action, source, created_at, expires_at)
      VALUES (?, 'portfolio', 'grant', 'manual', ?, ?)`).bind(aliceId, '2020-01-01', '2020-01-02').run();
    const expired = await (await check(portfolio + '?id=' + first.id, 403, { cookie: alice })).json();
    assert.equal(expired.error.code, 'access_expired');

    await change(aliceEmail, 'portfolio');
    queue('/v1/portfolio/analysis', () => Response.json({ code: 'connection_invalid' }, { status: 422 }));
    await check(portfolio, 409, { cookie: alice, method: 'POST' });
    const invalid = await (await check(connection, 200, { cookie: alice })).json();
    assert.equal(invalid.connection.state, 'invalid');

    const { promise: started, resolve: signalStarted } = Promise.withResolvers();
    const { promise: release, resolve: complete } = Promise.withResolvers();
    await check(connection, 200, { cookie: alice, method: 'PUT', body: { token: '11111', queryId: '111' } });
    queue('/v1/portfolio/analysis', async () => {
      signalStarted();
      await release;
      return Response.json({ as_of: '2026-01-02', positions: [], priorities: [], gaps: [] });
    });
    const pending = call(portfolio, { cookie: alice, method: 'POST' });
    try {
      await Promise.race([started, pending.then(response => assert.fail('upstream never started: ' + response.status))]);
      await check(portfolio, 409, { cookie: alice, method: 'POST' });
      await check(connection, 200, { cookie: alice, method: 'PUT', body: { token: '22222', queryId: '222' } });
      await check(portfolio, 409, { cookie: alice, method: 'POST' });
    } finally {
      complete();
    }
    const stale = await pending;
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).error.code, 'connection_changed');
    assert.deepEqual((await (await check(portfolio, 200, { cookie: alice })).json()).runs.map(run => run.id), [first.id]);

    await change(aliceEmail, 'portfolio', 'revoke');
    await check(portfolio + '?id=' + first.id, 403, { cookie: alice });
    await check(sentiment, 403, { cookie: bob });
    const audit = await (await check(lookup(aliceEmail), 200, { cookie: admin })).json();
    assert.equal(audit.history[0].action, 'revoke');
    assert.equal(audit.history[0].feature, 'portfolio');
    assert.equal(audit.history[0].actor_email, adminEmail);
    assert.equal(audit.history[0].source, 'manual');
    assert.equal(audit.next_before, null);

    const { promise: sentimentStarted, resolve: signalSentiment } = Promise.withResolvers();
    const { promise: releaseSentiment, resolve: completeSentiment } = Promise.withResolvers();
    queue('/v1/market-sentiment', async () => {
      signalSentiment();
      await releaseSentiment;
      return Response.json({ locale: 'en' });
    });
    const pendingSentiment = call(sentiment, { cookie: alice });
    try {
      await Promise.race([sentimentStarted, pendingSentiment.then(response => assert.fail('upstream never started: ' + response.status))]);
      await change(aliceEmail, 'market_sentiment', 'revoke');
    } finally {
      completeSentiment();
    }
    assert.equal((await pendingSentiment).status, 403);

    const older = db.prepare(`INSERT INTO feature_access_events (user_id, feature, action, source, created_at)
      VALUES (?, 'volume_profile', 'revoke', 'manual', '2026-01-01T00:00:00.000Z')`);
    await db.batch(Array.from({ length: 25 }, () => older.bind(aliceId)));
    const page = await (await check(lookup(aliceEmail), 200, { cookie: admin })).json();
    assert.equal(page.history.length, 25);
    const tail = await (await check(lookup(aliceEmail) + '&before=' + page.next_before, 200, { cookie: admin })).json();
    assert.ok(tail.history.length > 0 && tail.history.every(event => event.sequence < page.next_before));
    const bobHistory = await (await check(lookup('bob@example.test'), 200, { cookie: admin })).json();
    assert.equal(bobHistory.history.length, 1);

    const events = (await db.prepare('SELECT action, source, actor_user_id FROM feature_access_events WHERE user_id = ? ORDER BY sequence')
      .bind(aliceId).all()).results;
    assert.ok(events.some(event => event.action === 'revoke' && event.source === 'manual' && event.actor_user_id === 'admin-test'));
    assert.ok([...upstream.values()].every(handlers => handlers.length === 0));
  } finally {
    await worker.dispose();
  }
});
