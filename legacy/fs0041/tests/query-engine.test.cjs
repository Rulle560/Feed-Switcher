const test = require('node:test');
const assert = require('node:assert/strict');
require('../.test-dist/core.js');

const FSCore = globalThis.FSCore;
const NOW = new Date('2026-09-19T00:00:00Z');

function discovery(overrides = {}) {
  return FSCore.normalizeDiscoverySettings({
    active: true,
    topic: 'military',
    customTopic: '',
    language: 'en',
    region: 'US',
    timeRange: '7D',
    sort: 'RELEVANCE',
    ...overrides
  });
}

test('localized preset topic generates a native YouTube query with time and region hints', () => {
  const plan = FSCore.buildQueryPlan(discovery(), NOW);
  assert.equal(plan.searchTerm, 'military defense');
  assert.equal(plan.queryText, 'military defense after:2026-09-12');
  assert.equal(plan.mode, 'NATIVE_RELEVANCE');
  const url = new URL(plan.url);
  assert.equal(url.origin, 'https://www.youtube.com');
  assert.equal(url.pathname, '/results');
  assert.equal(url.searchParams.get('search_query'), 'military defense after:2026-09-12');
  assert.equal(url.searchParams.get('gl'), 'US');
  assert.equal(url.searchParams.has('sp'), false);
});

test('global region does not add a geolocation hint', () => {
  const plan = FSCore.buildQueryPlan(discovery({ region: 'GLOBAL', timeRange: 'ANY' }), NOW);
  const url = new URL(plan.url);
  assert.equal(url.searchParams.has('gl'), false);
  assert.equal(plan.appliedAfterDate, null);
});

test('popular mode uses YouTube native popularity token and does not claim pure view-count ordering', () => {
  const plan = FSCore.buildQueryPlan(discovery({ sort: 'VIEW_COUNT' }), NOW);
  const url = new URL(plan.url);
  assert.equal(plan.mode, 'NATIVE_POPULARITY');
  assert.equal(url.searchParams.get('sp'), 'CAMSAhAB');
  assert.equal(plan.notes.some((note) => note.includes('不等同于纯播放量倒序')), true);
});

test('recent mode with unlimited range falls back to a 30-day fresh candidate window', () => {
  const plan = FSCore.buildQueryPlan(discovery({ sort: 'LATEST', timeRange: 'ANY' }), NOW);
  assert.equal(plan.mode, 'FRESH_WINDOW');
  assert.equal(plan.effectiveTimeRange, '30D');
  assert.equal(plan.appliedAfterDate, '2026-08-20');
  assert.equal(plan.queryText, 'military defense after:2026-08-20');
  assert.equal(plan.notes.some((note) => note.includes('近 30 天候选池')), true);
});

test('custom topic remains exact user text and is not auto-translated', () => {
  const plan = FSCore.buildQueryPlan(discovery({
    topic: 'custom',
    customTopic: '冷战时期苏联军事技术',
    language: 'ja',
    region: 'JP',
    timeRange: '24H'
  }), NOW);
  assert.equal(plan.searchTerm, '冷战时期苏联军事技术');
  assert.equal(plan.queryText, '冷战时期苏联军事技术 after:2026-09-18');
  assert.equal(plan.notes.some((note) => note.includes('不自动翻译')), true);
});

test('24H is treated as an approximate date-level time window', () => {
  const plan = FSCore.buildQueryPlan(discovery({ timeRange: '24H' }), NOW);
  assert.equal(plan.appliedAfterDate, '2026-09-18');
  assert.equal(plan.notes.some((note) => note.includes('24 小时是近似时间窗')), true);
});


test('legacy generic Chinese migrates to simplified Chinese', () => {
  const normalized = FSCore.normalizeDiscoverySettings({ language: 'zh' });
  assert.equal(normalized.language, 'zh-Hans');
});

test('simplified and traditional Chinese use different topic query terms', () => {
  const hans = FSCore.buildQueryPlan(discovery({ topic: 'science', language: 'zh-Hans', region: 'GLOBAL' }), NOW);
  const hant = FSCore.buildQueryPlan(discovery({ topic: 'science', language: 'zh-Hant', region: 'TW' }), NOW);
  assert.equal(hans.searchTerm, '科学');
  assert.equal(hant.searchTerm, '科學');
  assert.equal(new URL(hant.url).searchParams.get('gl'), 'TW');
});

test('Hong Kong and Singapore are valid region hints', () => {
  const hk = FSCore.buildQueryPlan(discovery({ region: 'HK' }), NOW);
  const sg = FSCore.buildQueryPlan(discovery({ region: 'SG' }), NOW);
  assert.equal(new URL(hk.url).searchParams.get('gl'), 'HK');
  assert.equal(new URL(sg.url).searchParams.get('gl'), 'SG');
});

test('language note explicitly says Level A is not a hard filter', () => {
  const plan = FSCore.buildQueryPlan(discovery({ language: 'zh-Hans' }), NOW);
  assert.equal(plan.notes.some((note) => note.includes('并非硬过滤')), true);
});
