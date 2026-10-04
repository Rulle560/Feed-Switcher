const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/extension/core.js');

const FSCore = globalThis.FSCore;

test('default settings are Level A, enabled, and normal YouTube mode', () => {
  const settings = FSCore.createDefaultSettings();
  assert.equal(settings.gate, 'LEVEL_A');
  assert.equal(settings.enabled, true);
  assert.equal(settings.schemaVersion, 4);
  assert.equal(settings.discovery.active, false);
  assert.equal(settings.discovery.topic, 'history');
});

test('all advanced feature flags default to false', () => {
  const values = Object.values(FSCore.createDefaultSettings().flags);
  assert.equal(values.length, 6);
  assert.equal(values.every((value) => value === false), true);
});

test('v1 settings migrate safely to schema v4 without losing enable state', () => {
  const settings = FSCore.normalizeSettings({
    schemaVersion: 1,
    enabled: false,
    gate: 'LEVEL_A',
    flags: {}
  });
  assert.equal(settings.schemaVersion, 4);
  assert.equal(settings.enabled, false);
  assert.equal(settings.discovery.active, false);
  assert.equal(settings.discovery.timeRange, '7D');
});

test('topic discovery settings normalize allowed values', () => {
  const settings = FSCore.normalizeSettings({
    discovery: {
      active: true,
      topic: 'technology',
      customTopic: '  AI hardware  ',
      language: 'en',
      region: 'US',
      timeRange: '24H',
      sort: 'VIEW_COUNT'
    }
  });
  assert.deepEqual(settings.discovery, {
    active: true,
    topic: 'technology',
    customTopic: 'AI hardware',
    language: 'en',
    region: 'US',
    timeRange: '24H',
    sort: 'VIEW_COUNT'
  });
});

test('invalid discovery values fall back to Level A defaults', () => {
  const settings = FSCore.normalizeSettings({
    discovery: {
      active: 'yes', topic: 'sports', language: 'xx', region: 'XX', timeRange: 'YEAR', sort: 'TREND'
    }
  });
  assert.equal(settings.discovery.active, false);
  assert.equal(settings.discovery.topic, 'history');
  assert.equal(settings.discovery.language, 'any');
  assert.equal(settings.discovery.region, 'GLOBAL');
  assert.equal(settings.discovery.timeRange, '7D');
  assert.equal(settings.discovery.sort, 'RELEVANCE');
});

test('custom topic is bounded and human summary is stable', () => {
  const settings = FSCore.normalizeSettings({
    discovery: {
      active: true,
      topic: 'custom',
      customTopic: '冷战时期苏联军事技术',
      language: 'ja',
      region: 'JP',
      timeRange: '30D',
      sort: 'LATEST'
    }
  });
  assert.equal(FSCore.discoverySummary(settings.discovery), '冷战时期苏联军事技术 · 日本語 · 日本 · 30天 · 近期');
});

test('normalizeSettings never enables unknown or truthy non-boolean flags', () => {
  const settings = FSCore.normalizeSettings({
    enabled: true,
    gate: 'LEVEL_C',
    flags: { DERIVED_METRICS: 'yes', AI_TOPIC_TAGGING: true, UNKNOWN: true }
  });
  assert.equal(settings.gate, 'LEVEL_C');
  assert.equal(settings.flags.DERIVED_METRICS, false);
  assert.equal(settings.flags.AI_TOPIC_TAGGING, true);
  assert.equal('UNKNOWN' in settings.flags, false);
});
