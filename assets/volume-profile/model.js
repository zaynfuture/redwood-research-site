/* Normalize Redwood's local research files before drawing them. This module has no I/O. */
(() => {
  'use strict';

  const MAX_BINS = 10000;
  const MAX_TRADES = 200000;
  const MAX_SHARES = MAX_TRADES * 4294967295;
  const SYMBOL = /^[A-Z][A-Z0-9.-]{0,14}$/;
  const DIGEST = /^[a-f0-9]{64}$/;
  const DECIMAL = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,3})?$/;
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;
  const nyClock = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const decisions = new Set(['review_risk', 'wait_for_recovery', 'monitor_balance', 'monitor_strength', 'insufficient_evidence']);
  const exposures = new Set(['long_stock', 'short_stock', 'long_call', 'short_call', 'long_put', 'short_put', 'long_unknown', 'short_unknown']);
  const gapCodes = new Set(['pages_after_terminal', 'invalid_page', 'page_byte_budget_exceeded', 'total_byte_budget_exceeded',
    'missing_pagination_state', 'invalid_or_repeated_pagination', 'record_budget_exceeded', 'invalid_trade_record',
    'conflicting_trade_identity', 'pagination_incomplete', 'acquisition_incomplete', 'price_grid_budget_exceeded', 'no_eligible_trades']);
  gapCodes.add('time_bar_budget_exceeded');

  function requireValue(condition, message) {
    if (!condition) throw new Error(message);
  }
  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function number(value, name, min = -Infinity, max = Infinity) {
    const acceptable = typeof value === 'number' ||
      (typeof value === 'string' && value.length <= 120 && DECIMAL.test(value));
    const parsed = acceptable ? Number(value) : NaN;
    requireValue(Number.isFinite(parsed) && parsed >= min && parsed <= max, 'Invalid ' + name);
    return parsed;
  }
  function count(value, max, name) {
    requireValue(Number.isSafeInteger(value) && value >= 0 && value <= max, 'Invalid ' + name);
    return value;
  }
  function day(value) {
    requireValue(typeof value === 'string' && DATE.test(value), 'Invalid session date');
    const time = Date.parse(value + 'T00:00:00Z');
    requireValue(Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value, 'Invalid session date');
    return value;
  }
  function timestamp(value) {
    const match = typeof value === 'string' && STAMP.exec(value);
    requireValue(match, 'Invalid timestamp');
    day(match[1]);
    requireValue(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(match[2]), 'Invalid timestamp');
    const ms = Date.parse(match[1] + 'T' + match[2] + match[4]);
    requireValue(Number.isFinite(ms), 'Invalid timestamp');
    const fraction = (match[3] || '').padEnd(9, '0');
    return { ms, fraction, ns: BigInt(ms) * 1000000n + BigInt(fraction) };
  }
  function localTime(stamp) {
    const parts = Object.fromEntries(nyClock.formatToParts(stamp.ms).map(p => [p.type, p.value]));
    return { date: parts.year + '-' + parts.month + '-' + parts.day, time: [parts.hour, parts.minute, parts.second].join(':') };
  }
  function symbol(value) {
    requireValue(typeof value === 'string' && SYMBOL.test(value), 'Invalid ticker');
    return value;
  }
  // Feature 048's grid uses at most eight decimal places. Scale to integers before checking adjacency.
  function priceUnits(value) {
    number(value, 'grid price', 0, 1001000000);
    const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
    const [whole, fraction = ''] = mantissa.split('.');
    const digits = (whole + fraction).replace(/^-/, '');
    const scale = 8 + Number(exponent) - fraction.length;
    requireValue(Math.abs(scale) < 128, 'Invalid grid precision');
    const coefficient = BigInt(digits);
    if (scale >= 0) return coefficient * 10n ** BigInt(scale);
    const divisor = 10n ** BigInt(-scale);
    requireValue(coefficient % divisor === 0n, 'Invalid grid precision');
    return coefficient / divisor;
  }
  function optionalMetric(row, key, min = -Infinity) {
    return row[key] === undefined || row[key] === null ? null : number(row[key], key, min);
  }

  function parseProfile(doc) {
    const licensedDelivery = doc.rights_decision === 'licensed_redistribution';
    requireValue(doc.schema_version === 1 && doc.provider === 'alpaca' && doc.feed === 'sip' &&
      (doc.rights_decision === 'allowed_local' || licensedDelivery) &&
      (!licensedDelivery || (doc.redistribution_allowed === true &&
        doc.delivery_rights_basis === 'operator_attested_provider_redistribution_rights')) &&
      doc.currency === 'USD' && doc.price_basis === 'unadjusted' &&
      doc.interval_bounds === 'inclusive' && ['all', 'regular_clock'].includes(doc.session), 'Unsupported profile metadata');
    const start = timestamp(doc.start);
    const end = timestamp(doc.end);
    requireValue(start.ns <= end.ns && end.ns - start.ns <= 604800000000000n && end.ns <= timestamp(doc.as_of).ns, 'Invalid profile interval');
    const open = localTime(start);
    const finish = localTime(end);
    let window = 'custom';
    const schedule = doc.session_schedule;
    const validSchedule = licensedDelivery && schedule?.basis === 'alpaca_us_market_calendar' &&
      schedule.session_date === finish.date && schedule.start === doc.start && schedule.end === doc.end &&
      localTime(timestamp(schedule.open)).time === '09:30:00' &&
      timestamp(schedule.close).ns === end.ns + 1n;
    if (doc.session === 'regular_clock' && open.date === finish.date && start.fraction === '000000000' &&
        end.fraction === '999999999' && (finish.time === '15:59:59' || validSchedule)) {
      if (open.time === '09:30:00') window = 'regular-session';
      else if ((validSchedule && end.ns + 1n - start.ns === 1800000000000n) ||
               (open.time === '15:30:00' && finish.time === '15:59:59')) window = 'closing-half-hour';
    }
    const studies = doc.daily_moving_averages;
    const movingAverages = {};
    if (licensedDelivery && studies?.status === 'available' && studies.as_of === finish.date &&
        studies.price_basis === 'split_adjusted' && studies.source === 'Alpaca SIP daily bars') {
      for (const length of [50, 200]) {
        const value = studies.values?.[length];
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) movingAverages[length] = value;
      }
    }
    const step = number(doc.price_step, 'bin size', 0.000001, 1000000);
    const unit = priceUnits(doc.price_step);
    const totalShares = count(doc.total_shares, MAX_SHARES, 'share total');
    const accepted = count(doc.counts?.accepted, MAX_TRADES, 'accepted trade count');
    requireValue(Array.isArray(doc.bins) && doc.bins.length <= MAX_BINS, 'Invalid price grid');
    let previous = null;
    let shares = 0;
    let percentTotal = 0;
    const bins = doc.bins.map(row => {
      requireValue(isRecord(row), 'Invalid price bin');
      const lo = priceUnits(row.lower), hi = priceUnits(row.upper);
      const volume = count(row.shares, MAX_SHARES, 'bin volume');
      const percent = number(row.percent, 'bin percent', 0, 100);
      requireValue(hi === lo + unit && lo % unit === 0n && (previous === null || lo === previous), 'Misaligned price grid');
      previous = hi;
      shares += volume;
      percentTotal += percent;
      requireValue(shares <= MAX_SHARES, 'Invalid share total');
      return { lower: Number(row.lower), upper: Number(row.upper), shares: volume, percent };
    });
    requireValue(!bins.length || shares === totalShares, 'Share volumes do not reconcile');
    requireValue(!bins.length || Math.abs(percentTotal - 100) < 0.000001, 'Bin percentages do not reconcile');
    const timeBarsRaw = doc.time_bars;
    let timeBars = [];
    if (timeBarsRaw !== undefined) {
      requireValue(Array.isArray(timeBarsRaw) && timeBarsRaw.length <= 10080 &&
        doc.time_bar_seconds === 60 && doc.time_bar_method === 'exact_accepted_trade_aggregation',
        'Invalid time-bar metadata');
      let previousStart = null, timeShares = 0, timeTrades = 0;
      timeBars = timeBarsRaw.map(row => {
        requireValue(isRecord(row), 'Invalid time bar');
        const at = timestamp(row.start);
        requireValue(at.ns + 60000000000n > start.ns && at.ns <= end.ns && at.ns % 60000000000n === 0n &&
          (previousStart === null || at.ns > previousStart), 'Invalid time-bar sequence');
        previousStart = at.ns;
        const openPrice = number(row.open, 'time open', Number.MIN_VALUE, 1000000000);
        const highPrice = number(row.high, 'time high', Number.MIN_VALUE, 1000000000);
        const lowPrice = number(row.low, 'time low', Number.MIN_VALUE, 1000000000);
        const closePrice = number(row.close, 'time close', Number.MIN_VALUE, 1000000000);
        const barShares = count(row.shares, MAX_SHARES, 'time-bar shares');
        const trades = count(row.trades, MAX_TRADES, 'time-bar trades');
        const barVwap = number(row.vwap, 'time-bar VWAP', Number.MIN_VALUE, 1000000000);
        requireValue(barShares > 0 && trades > 0 && lowPrice <= openPrice && openPrice <= highPrice &&
          lowPrice <= closePrice && closePrice <= highPrice && lowPrice <= barVwap && barVwap <= highPrice,
          'Invalid time-bar values');
        timeShares += barShares; timeTrades += trades;
        requireValue(timeShares <= MAX_SHARES && timeTrades <= MAX_TRADES, 'Invalid time-bar totals');
        return {start: row.start, ms: at.ms, open: openPrice, high: highPrice, low: lowPrice,
          close: closePrice, shares: barShares, trades, vwap: barVwap};
      });
      requireValue(timeShares === totalShares && timeTrades === accepted, 'Time bars do not reconcile');
    }
    requireValue(Array.isArray(doc.gaps) && doc.gaps.length <= 128 &&
      Array.isArray(doc.source_pages) && doc.source_pages.length <= 20, 'Invalid profile provenance');
    const gaps = [...new Set(doc.gaps.map(g => gapCodes.has(g?.code) ? g.code : 'source_data_gap'))];
    const sources = doc.source_pages.map((p, i) => {
      requireValue(isRecord(p) && p.page === i + 1 && typeof p.sha256 === 'string' && DIGEST.test(p.sha256) &&
        p.source_id === 'alpaca-sip-page-' + p.sha256, 'Invalid source page');
      return p.source_id;
    });
    requireValue(['complete', 'invalid', 'partial', 'empty'].includes(doc.status) && typeof doc.complete === 'boolean', 'Invalid profile status');
    const complete = doc.status === 'complete';
    requireValue(complete === doc.complete, 'Conflicting profile status');
    let poc = null, valueArea = null, vwap = null, analysis = null;
    if (complete) {
      requireValue(doc.pagination_complete === true && doc.data_quality_valid === true && sources.length && !gaps.length &&
        accepted > 0 && totalShares >= accepted && bins.length && totalShares > 0 && isRecord(doc.levels) &&
        (doc.counts.invalid == null || doc.counts.invalid === 0) &&
        (doc.counts.received == null || (Number.isSafeInteger(doc.counts.received) &&
          doc.counts.received >= accepted && doc.counts.received <= MAX_TRADES)), 'Incomplete evidence for levels');
      const first = timestamp(doc.source_first_at).ns, last = timestamp(doc.source_last_at).ns;
      requireValue(start.ns <= first && first <= last && last <= end.ns, 'Invalid source observation time');
      const reportedPoc = doc.levels.poc, area = doc.levels.value_area;
      requireValue(isRecord(reportedPoc) && isRecord(area), 'Missing backend levels');
      const pocLower=number(reportedPoc.lower,'POC'),pocUpper=number(reportedPoc.upper,'POC');
      const areaLower=number(area.lower,'value area'),areaUpper=number(area.upper,'value area');
      const pocBin=bins.find(bin=>bin.lower===pocLower&&bin.upper===pocUpper);
      const areaShares=count(area.shares,MAX_SHARES,'value-area shares');
      const areaPercent=number(area.actual_percent,'value-area percent',0,100);
      requireValue(pocBin&&reportedPoc.shares===pocBin.shares&&area.target_percent===70&&
        bins.some(bin=>bin.lower===areaLower)&&bins.some(bin=>bin.upper===areaUpper)&&
        areaLower<=pocLower&&pocUpper<=areaUpper&&areaShares<=totalShares&&
        Math.abs(areaPercent-areaShares/totalShares*100)<0.000001,'Invalid backend levels');
      vwap = number(doc.levels.vwap, 'VWAP', Number.MIN_VALUE);
      requireValue(vwap >= bins[0].lower && vwap <= bins[bins.length - 1].upper &&
        Number.isFinite(vwap), 'VWAP outside profile bounds');
      poc = { ...pocBin };
      valueArea = { lower: areaLower, upper: areaUpper, shares: areaShares, percent: areaPercent };
      if (doc.analysis != null) {
        const view=doc.analysis,distribution=view.volume_distribution,position=view.position,reference=view.reference;
        requireValue(isRecord(view)&&view.schema_version===1&&isRecord(distribution)&&isRecord(position)&&
          isRecord(reference)&&reference.kind==='last_accepted_trade'&&['below','inside','above'].includes(position.poc)&&
          ['below','inside','above'].includes(position.value_area)&&view.time_bar_count===timeBars.length,'Invalid backend analysis');
        const normalized={};let distributionShares=0,distributionPercent=0;
        for(const key of ['below','at','above']){const item=distribution[key];requireValue(isRecord(item),'Invalid backend distribution');
          const itemShares=count(item.shares,MAX_SHARES,'distribution shares'),itemPercent=number(item.percent,'distribution percent',0,100);
          distributionShares+=itemShares;distributionPercent+=itemPercent;normalized[key]={shares:itemShares,percent:itemPercent};}
        const referencePrice=number(reference.price,'reference price',Number.MIN_VALUE,1000000000);
        requireValue(distributionShares===totalShares&&Math.abs(distributionPercent-100)<0.000001&&
          referencePrice===timeBars.at(-1)?.close&&reference.at===doc.source_last_at,'Backend analysis does not reconcile');
        analysis={reference:{kind:reference.kind,price:referencePrice,at:reference.at},distribution:normalized,
          position:{poc:position.poc,valueArea:position.value_area},timeBarCount:view.time_bar_count};
      }
      requireValue(!licensedDelivery||analysis,'Licensed delivery requires backend analysis');
    } else {
      requireValue(doc.levels == null && doc.analysis == null, 'Incomplete profile contains finalized analysis');
    }
    const networkChecked = doc.origin === 'alpaca_market_data' && doc.network_checked === true;
    const origin = networkChecked ? 'Alpaca SIP' : 'Supplied SIP pages';
    return { symbol: symbol(doc.symbol), date: finish.date, window, start: doc.start, end: doc.end,
      step, bins, totalShares, accepted, complete, status: doc.status, gaps, poc, valueArea, vwap, sources, source: origin,
      provider: doc.provider, feed: doc.feed, origin: doc.origin, networkChecked, asOf: doc.as_of,
      sourceFirstAt: doc.source_first_at || null, sourceLastAt: doc.source_last_at || null,
      rightsDecision: doc.rights_decision, paginationComplete: doc.pagination_complete === true, timeBars,
      dataQualityValid: doc.data_quality_valid === true, analysis, movingAverages,
      dailyStudyStatus: studies?.status, scheduledClose: validSchedule ? schedule.close : null };
  }

  function contextRow(ticker, metrics, date, sourceId) {
    requireValue(isRecord(metrics) && metrics.session_date === date, 'Unverified daily session');
    if (metrics.source_bar_at != null) requireValue(localTime(timestamp(metrics.source_bar_at)).date === date, 'Daily date mismatch');
    return { symbol: symbol(ticker), date, window: null, start: null, end: null,
      close: number(metrics.close, 'close', Number.MIN_VALUE, 1000000000),
      dayChange: optionalMetric(metrics, 'ret_pct'), fiveDayReturn: optionalMetric(metrics, 'five_day_ret_pct'),
      smaDistance: optionalMetric(metrics, 'distance20_sma_pct'), volumeMultiple: optionalMetric(metrics, 'volume_vs_prior20_avg', 0),
      decision: null, exposures: [], sourceId, profileSources: [], step: null };
  }
  function parseReview(doc) {
    const date = day(doc.session_date);
    requireValue(doc.schema_version === 1 && doc.live === false && ['regular-session', 'closing-half-hour'].includes(doc.window) &&
      Array.isArray(doc.rows) && doc.rows.length <= 1000, 'Invalid holdings review');
    const contexts = [];
    for (const row of doc.rows) {
      if (!isRecord(row) || !row.daily) continue;
      const id = row.daily.source_id;
      requireValue(typeof id === 'string' && /^alpaca-sip-bars-[a-f0-9]{64}$/.test(id), 'Invalid daily source');
      const entry = contextRow(row.symbol, row.daily, date, id);
      entry.window = doc.window;
      if (row.profile) {
        const start = timestamp(row.profile.start), end = timestamp(row.profile.end);
        requireValue(start.ns <= end.ns && localTime(start).date === date && localTime(end).date === date, 'Invalid context window');
        entry.start = row.profile.start; entry.end = row.profile.end;
        if (row.profile.price_step != null) entry.step = number(row.profile.price_step, 'context price step', 0.000001, 1000000);
        if (row.profile.source_ids != null) {
          requireValue(Array.isArray(row.profile.source_ids) && row.profile.source_ids.length <= 20 &&
            row.profile.source_ids.every(id => typeof id === 'string' && /^alpaca-sip-page-[a-f0-9]{64}$/.test(id)), 'Invalid context sources');
          entry.profileSources = row.profile.source_ids.slice();
        }
      }
      entry.decision = row.status === 'reviewable' && decisions.has(row.decision) ? row.decision : null;
      const labels = row.exposure?.labels;
      entry.exposures = Array.isArray(labels) ? [...new Set(labels.slice(0, 12).filter(x => exposures.has(x)))] : [];
      contexts.push(entry);
    }
    return contexts;
  }
  function parseDaily(doc) {
    requireValue(doc.endpoint === 'https://data.alpaca.markets/v2/stocks/bars' &&
      doc.parameters?.feed === 'sip' && doc.parameters?.timeframe === '1Day' &&
      ['raw', 'split'].includes(doc.parameters?.adjustment) && typeof doc.sha256 === 'string' && DIGEST.test(doc.sha256) &&
      isRecord(doc.metrics) && Object.keys(doc.metrics).length <= 1000, 'Invalid daily bars provenance');
    return Object.entries(doc.metrics).map(([ticker, metrics]) => {
      requireValue(isRecord(metrics) && typeof metrics.source_bar_at === 'string', 'Missing source bar timestamp');
      return contextRow(ticker, metrics, day(metrics.session_date), 'alpaca-sip-bars-' + doc.sha256);
    });
  }
  function parse(raw) {
    const inputs = Array.isArray(raw) ? raw : [raw];
    requireValue(inputs.length > 0 && inputs.length <= 512, 'Too many documents');
    const profiles = [], contexts = [];
    let binTotal = 0;
    for (const input of inputs) {
      requireValue(isRecord(input), 'Expected a research document');
      const doc = input.ok === true ? input.data : input;
      requireValue(isRecord(doc), 'Expected a successful research document');
      if (doc.kind === 'historical_volume_profile') {
        binTotal += Array.isArray(doc.bins) ? doc.bins.length : 0;
        requireValue(binTotal <= 250000, 'Too many price bins');
        profiles.push(parseProfile(doc));
      } else if (doc.kind === 'holdings_technical_review') {
        contexts.push(...parseReview(doc));
      } else if (doc.metrics) {
        contexts.push(...parseDaily(doc));
      } else {
        throw new Error('Unsupported research document');
      }
      requireValue(contexts.length <= 5000, 'Too many context rows');
    }
    return { profiles, contexts };
  }
  // A daily close belongs to a symbol and session. A holdings decision also belongs to a specific grid and source pages.
  function contextFor(profile, contexts) {
    const candidates = contexts.filter(c => c.symbol === profile.symbol && c.date === profile.date);
    if (!candidates.length || candidates.some(c => c.close !== candidates[0].close)) return null;
    const exact = candidates.find(c => c.window === profile.window && c.start === profile.start && c.end === profile.end &&
      c.step === profile.step && c.profileSources.length > 0 && c.profileSources.length === profile.sources.length &&
      c.profileSources.every((source, i) => source === profile.sources[i]));
    if (exact && profile.complete) return exact;
    const daily = candidates.find(c => c.window === null) || candidates[0];
    return { ...daily, window: null, start: null, end: null, decision: null, exposures: [], step: null, profileSources: [] };
  }
  globalThis.ProfileModel = Object.freeze({ parse, contextFor });
})();
