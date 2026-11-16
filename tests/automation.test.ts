import assert from 'node:assert/strict'
import { test } from 'node:test'

import { latestAutomationRun } from '../src/core/automation.ts'

test('setup survives reopening when the native read has no automation run', () => {
  const observed = latestAutomationRun({ at: 1234, verdict: 'ring' })
  const restored = JSON.parse(JSON.stringify(observed))
  assert.deepEqual(latestAutomationRun(undefined, restored), observed)
  assert.deepEqual(latestAutomationRun({ at: 1000, verdict: 'disarmed' }, restored), observed)
  assert.deepEqual(latestAutomationRun({ at: 2000, verdict: 'ring' }, restored), { at: 2000, verdict: 'ring' })
})

test('fresh installs and invalid stored data still require setup', () => {
  assert.equal(latestAutomationRun(undefined), undefined)
  for (const value of [null, {}, true, { at: '1234', verdict: 'ring' }, { at: NaN, verdict: 'ring' }, { at: 0, verdict: 'ring' }, { at: 1234 }]) {
    assert.equal(latestAutomationRun(undefined, value), undefined)
  }
})
