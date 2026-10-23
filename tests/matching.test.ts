// The TypeScript matcher against the shared vectors that the Java and Swift
// ports also run (plugins/remote-ring/test-fixtures/matching.json).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { evaluateMessage } from '../src/core/matcher.ts'
import { normalizePhrase, sendersMatch } from '../src/core/normalize.ts'

const fixtures = JSON.parse(readFileSync(new URL('../plugins/remote-ring/test-fixtures/matching.json', import.meta.url), 'utf8'))

test('normalizePhrase', () => {
  for (const [input, expected] of fixtures.normalizePhrase) assert.equal(normalizePhrase(input), expected, input)
})

test('sendersMatch', () => {
  for (const [a, b, expected] of fixtures.sendersMatch) assert.equal(sendersMatch(a, b), expected, `${a} vs ${b}`)
})

test('evaluateMessage', () => {
  for (const c of fixtures.evaluate) assert.equal(evaluateMessage(c.config, c.body, c.sender), c.verdict, c.body)
})
