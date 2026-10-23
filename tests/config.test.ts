// Sanitizing the stored config, which native code also writes.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DEFAULT_TONE, TONES, sanitizeConfig } from '../src/core/config.ts'

test('config/tone keeps known tones', () => {
  for (const tone of TONES) assert.equal(sanitizeConfig({ tone }, 'a b c').tone, tone)
})

test('config/tone falls back for missing or unknown tones', () => {
  assert.equal(sanitizeConfig({}, 'a b c').tone, DEFAULT_TONE)
  assert.equal(sanitizeConfig({ tone: 'kazoo' }, 'a b c').tone, DEFAULT_TONE)
  assert.equal(sanitizeConfig(null, 'a b c').tone, DEFAULT_TONE)
})

test('config/volume defaults to max and clamps to 10–100', () => {
  assert.equal(sanitizeConfig({}, 'a b c').volume, 100)
  assert.equal(sanitizeConfig({ volume: 40 }, 'a b c').volume, 40)
  assert.equal(sanitizeConfig({ volume: 0 }, 'a b c').volume, 10)
  assert.equal(sanitizeConfig({ volume: 250 }, 'a b c').volume, 100)
  assert.equal(sanitizeConfig({ volume: 'loud' }, 'a b c').volume, 100)
})

test('config/chatApps is off unless explicitly on', () => {
  assert.equal(sanitizeConfig({}, 'a b c').chatApps, false)
  assert.equal(sanitizeConfig({ chatApps: 'yes' }, 'a b c').chatApps, false)
  assert.equal(sanitizeConfig({ chatApps: true }, 'a b c').chatApps, true)
})
