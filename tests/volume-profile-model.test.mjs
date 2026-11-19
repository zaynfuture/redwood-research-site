import assert from 'node:assert/strict';
import test from 'node:test';
import '../assets/volume-profile/model.js';

const hash = 'a'.repeat(64);
const source = 'alpaca-sip-page-' + hash;
const sessionDate = '2026-06-15';
const start = sessionDate + 'T19:30:00Z'; // 15:30 EDT
const end = sessionDate + 'T19:59:59.999999999Z';
function sample() {
  return {
    kind: 'historical_volume_profile', schema_version: 1, provider: 'alpaca', feed: 'sip', origin: 'caller_supplied_pages',
    symbol: 'DEMO', rights_decision: 'allowed_local', currency: 'USD', price_basis: 'unadjusted', interval_bounds: 'inclusive',
    start, end, as_of: sessionDate + 'T21:00:00Z', source_first_at: start, source_last_at: end,
    source_pages: [{page: 1, sha256: hash, source_id: source}], session: 'regular_clock',
    price_step: '.10', total_shares: 10, counts: {accepted: 3}, complete: true, status: 'complete',
    time_bar_seconds:60,time_bar_method:'exact_accepted_trade_aggregation',
    time_bars:[{start,open:'10.22',high:'10.45',low:'10.22',close:'10.38',shares:10,trades:3,vwap:'10.31'}],
    pagination_complete: true, data_quality_valid: true, gaps: [],
    bins: [{lower: '10.20', upper: '10.30', shares: 4,percent:'40'}, {lower: '10.30', upper: '10.40', shares: 4,percent:'40'},
      {lower: '10.40', upper: '10.50', shares: 2,percent:'20'}],
    levels: {poc: {lower: '10.20', upper: '10.30', shares: 4}, value_area: {lower: '10.20', upper: '10.40', shares: 8, target_percent: 70,actual_percent:'80'}, vwap: '10.31'},
    analysis:{schema_version:1,reference:{kind:'last_accepted_trade',price:'10.38',at:end},
      volume_distribution:{below:{shares:4,percent:'40'},at:{shares:4,percent:'40'},above:{shares:2,percent:'20'}},
      position:{poc:'above',value_area:'inside'},time_bar_count:1}
  };
}
function parseProfile(raw) { return ProfileModel.parse(raw).profiles[0]; }

test('retains backend-owned levels, percentages and analysis without recomputing them', () => {
  const p = parseProfile({ok: true, data: sample()});
  assert.equal(p.window, 'closing-half-hour');
  assert.equal(p.date, sessionDate);
  assert.deepEqual(p.poc, {lower: 10.2, upper: 10.3, shares: 4, percent: 40});
  assert.deepEqual(p.valueArea, {lower: 10.2, upper: 10.4, shares: 8, percent: 80});
  assert.equal(p.bins[2].percent, 20);
  assert.deepEqual(p.analysis.position,{poc:'above',valueArea:'inside'});
  const authoritative=sample();authoritative.analysis.position.poc='inside';
  assert.equal(parseProfile(authoritative).analysis.position.poc,'inside');
  const shortened = sample(); shortened.end = sessionDate + 'T19:59:59.999999998Z'; shortened.source_last_at = shortened.end;shortened.analysis.reference.at=shortened.end;
  assert.equal(parseProfile(shortened).window, 'custom');
});
test('accepts only explicitly attested licensed public delivery metadata', () => {
  const licensed = sample();
  Object.assign(licensed, {origin:'alpaca_market_data',network_checked:true,
    rights_decision:'licensed_redistribution',redistribution_allowed:true,
    delivery_rights_basis:'operator_attested_provider_redistribution_rights'});
  assert.equal(parseProfile(licensed).rightsDecision, 'licensed_redistribution');
  delete licensed.delivery_rights_basis;
  assert.throws(() => parseProfile(licensed));
});
test('requires ordered exact time bars that reconcile to the profile', () => {
  const parsed = parseProfile(sample());
  assert.equal(parsed.timeBars.length, 1);
  assert.equal(parsed.timeBars[0].shares, 10);
  for (const change of [p => p.time_bars[0].shares = 9, p => p.time_bars[0].trades = 2,
    p => p.time_bars[0].high = '10.30', p => p.time_bars[0].start = '2026-06-15T19:30:01Z',
    p => p.time_bar_method = 'estimated']) {
    const item=sample();change(item);assert.throws(()=>parseProfile(item));
  }
});
test('withholds levels on incomplete files and rejects altered final levels or raw account files', () => {
  const p = sample();
  Object.assign(p, {complete: false, status: 'partial', pagination_complete: false, gaps: [{code:'pagination_incomplete'}], levels: null,analysis:null});
  assert.equal(parseProfile(p).poc, null);
  assert.deepEqual(parseProfile(p).gaps, ['pagination_incomplete']);
  for (const change of [p => p.bins[1].upper = '10.401', p => p.total_shares = 11, p => p.levels.poc.lower = 10.3,
    p => p.levels.value_area.shares = 7, p => p.counts.accepted = true, p => p.rights_decision = 'denied',
    p => p.source_pages[0].source_id = 'fake', p => p.start = '2026-02-31T15:30:00Z',
    p => p.bins = Array(10001).fill(p.bins[0]), p => p.counts.invalid = 1, p => p.counts.received = 1,
    p => p.analysis.volume_distribution.below.shares = 3, p => p.analysis.reference.price = '10.39']) {
    const item = sample(); change(item); assert.throws(() => parseProfile(item));
  }
  assert.throws(() => ProfileModel.parse({ positions: [], main: { account: 'sensitive' } }));
});
test('matches decisions only to exact same-session source profiles; daily context survives on other grids', () => {
  const review = {kind:'holdings_technical_review', schema_version:1, live:false, session_date:sessionDate, window:'closing-half-hour',
    rows:[{symbol:'DEMO', status:'reviewable', decision:'monitor_balance', exposure:{labels:['long_stock','unknown-private-id']},
      daily:{session_date:sessionDate, close:10.3, ret_pct:-1, source_id:'alpaca-sip-bars-'+hash},
      profile:{start,end,price_step:0.1,source_ids:[source]}}]};
  const {profiles:[p],contexts} = ProfileModel.parse([sample(),review]);
  const hit = ProfileModel.contextFor(p, contexts);
  assert.deepEqual(hit.exposures, ['long_stock']); assert.equal(hit.decision, 'monitor_balance');
  assert.equal(ProfileModel.contextFor({...p, step:0.2}, contexts).decision, null);
  assert.equal(ProfileModel.contextFor({...p, date:'2026-06-16'}, contexts), null);
  assert.equal(ProfileModel.contextFor(p, [...contexts,{...hit,close:10.25}]), null);
});
test('validates per-symbol bar timestamps and never attaches an older session close', () => {
  const raw = {endpoint:'https://data.alpaca.markets/v2/stocks/bars', parameters:{feed:'sip',timeframe:'1Day',adjustment:'split'},
    sha256:hash,metrics:{DEMO:{session_date:sessionDate,source_bar_at:sessionDate+'T04:00:00Z',close:10.3}}};
  const p=parseProfile(sample()), {contexts}=ProfileModel.parse(raw);
  assert.equal(ProfileModel.contextFor(p,contexts).close,10.3);
  raw.metrics.DEMO.source_bar_at='2026-06-14T04:00:00Z';
  assert.throws(()=>ProfileModel.parse(raw));
});

test('retains an early calendar close and only licensed session-matched moving averages', () => {
  const profile = sample();
  const open = sessionDate + 'T13:30:00Z';
  const close = sessionDate + 'T17:00:00Z';
  const last = sessionDate + 'T16:59:59.999999999Z';
  Object.assign(profile, {
    origin: 'alpaca_market_data', network_checked: true,
    rights_decision: 'licensed_redistribution', redistribution_allowed: true,
    delivery_rights_basis: 'operator_attested_provider_redistribution_rights',
    start: open, end: last, source_first_at: open, source_last_at: last,
    session_schedule: {
      basis: 'alpaca_us_market_calendar', session_date: sessionDate,
      start: open, end: last, open, close,
    },
    daily_moving_averages: {
      status: 'available', source: 'Alpaca SIP daily bars',
      price_basis: 'split_adjusted', as_of: sessionDate, values: {'50': 10.25},
    },
  });
  profile.time_bars[0].start = open;
  profile.analysis.reference.at = last;
  assert.equal(parseProfile(profile).window, 'regular-session');
  assert.equal(parseProfile(profile).scheduledClose, close);
  assert.deepEqual(parseProfile(profile).movingAverages, {'50': 10.25});
  profile.daily_moving_averages.as_of = '2026-06-12';
  assert.deepEqual(parseProfile(profile).movingAverages, {});
});
