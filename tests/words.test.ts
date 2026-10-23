// Every passphrase word list: 128 entries, distinct after normalization
// (so each pick really adds 7 bits), none too short to type.
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { test } from 'node:test'

import { normalizePhrase } from '../src/core/normalize.ts'
import { LANGUAGES } from '../src/i18n/languages.ts'

const dir = new URL('../src/i18n/words/', import.meta.url)

test('one word list per language', () => {
  const files = readdirSync(dir).map((f) => f.replace('.ts', '')).sort()
  assert.deepEqual(files, LANGUAGES.map((l) => l.code).sort())
})

for (const { code } of LANGUAGES) {
  test(`words/${code}`, async () => {
    const words: readonly string[] = (await import(new URL(`${code}.ts`, dir).href)).default
    assert.equal(words.length, 128)
    const normalized = words.map(normalizePhrase)
    assert.equal(new Set(normalized).size, 128, 'distinct after normalization')
    for (const n of normalized) assert.ok(n.length >= 2, `too short: ${n}`)
  })
}
