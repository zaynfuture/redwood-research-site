import assert from 'node:assert/strict';
import { test } from 'node:test';

// Point this smoke test at the built Wrangler preview so the real RSC transform is exercised.
const origin = process.env.REDWOOD_PROFILE_PREVIEW_URL;
test('Worker serves the public volume profile page in English only', {skip: !origin}, async () => {
  const endpoint = new URL('/volume-profile?lang=zh-CN', origin);
  const response = await fetch(endpoint);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-language'), 'en');
  const html = await response.text();
  assert.ok(html.includes('<html lang="en">'));
  assert.doesNotMatch(html, /<!-- PROFILE_/);
  assert.doesNotMatch(html, /type="file"|Import verified data/);
  assert.match(html, /Refresh analysis/);
  const block = html.match(/<script id="profile-initial" type="application\/json">([\s\S]+?)<\/script>/);
  assert.ok(block, 'initial data present');
  const initial = JSON.parse(block[1]);
  assert.equal(initial.demo, true);
  assert.ok(initial.documents.length > 0);
  const directoryBlock = html.match(/<script id="symbol-directory" type="application\/json">([\s\S]+?)<\/script>/);
  assert.ok(directoryBlock, 'symbol directory present');
  const directory = JSON.parse(directoryBlock[1]);
  assert.ok(directory.symbols.length > 10000);
});
