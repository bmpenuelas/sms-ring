import assert from 'node:assert/strict'
import { test } from 'node:test'

import { entropyBits, generateWords, secureRandomInt } from '../src/core/passphrase.ts'

test('secureRandomInt stays in range', () => {
  for (let i = 0; i < 2000; i++) {
    const n = secureRandomInt(7)
    assert.ok(n >= 0 && n < 7)
  }
})

test('generateWords picks distinct words and clamps the count', () => {
  const list = Array.from({ length: 50 }, (_, i) => `w${i}`)
  for (let i = 0; i < 200; i++) {
    const words = generateWords(list, 4)
    assert.equal(words.length, 4)
    assert.equal(new Set(words).size, 4)
  }
  assert.equal(generateWords(list, 1).length, 2)
  assert.equal(generateWords(list, 99).length, 6)
})

test('entropyBits', () => {
  assert.equal(Math.round(entropyBits(128, 1)), 7)
  assert.ok(entropyBits(128, 3) > 20)
})
